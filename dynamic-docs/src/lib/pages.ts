import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { canAccessPublishedRevision, serializeRevision } from "@/lib/content";

const pageInclude = {
  revisions: {
    orderBy: { revision: "desc" },
    include: {
      reviewer: { select: { name: true, email: true } },
      items: {
        orderBy: { position: "asc" },
        include: {
          chunk: {
            include: { published: { include: { revision: true } } },
          },
        },
      },
    },
  },
  published: {
    include: {
      revision: {
        include: {
          reviewer: { select: { name: true, email: true } },
          items: {
            orderBy: { position: "asc" },
            include: { chunk: { include: { published: { include: { revision: true } } } } },
          },
        },
      },
    },
  },
  languageGroup: {
    include: {
      pages: {
        include: { revisions: { orderBy: { revision: "desc" as const }, take: 1 } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
} satisfies Prisma.DocPageInclude;

type PageWithRevisions = Prisma.DocPageGetPayload<{ include: typeof pageInclude }>;
type PageRevisionWithItems = PageWithRevisions["revisions"][number];

export type PublishedPageResult = {
  id: string;
  slug: string;
  revision: number;
  title: string;
  summary: string;
  language: string;
  product: string;
  apiVersion: string;
  publishedAt: string;
  chunks: { position: number; chunk: ReturnType<typeof serializeRevision> }[];
  translations: { slug: string; title: string; language: string; product: string; apiVersion: string }[];
};

export function serializePageRevision(revision: PageRevisionWithItems) {
  return {
    id: revision.id,
    pageId: revision.pageId,
    revision: revision.revision,
    title: revision.title,
    summary: revision.summary,
    language: revision.language,
    product: revision.product,
    apiVersion: revision.apiVersion,
    reviewStatus: revision.reviewStatus,
    reviewer: revision.reviewer,
    reviewComment: revision.reviewComment,
    createdAt: revision.createdAt.toISOString(),
    items: revision.items.map((item) => ({
      position: item.position,
      chunkId: item.chunkId,
      publishedRevision: item.chunk.published
        ? serializeRevision(item.chunk.published.revision)
        : null,
    })),
  };
}

function visiblePageRevisions(page: PageWithRevisions, user: CurrentUser) {
  if (user.role === "ADMIN") return page.revisions;
  if (user.role === "AUTHOR") {
    return page.createdBy === user.id ? page.revisions : [];
  }
  if (user.role === "REVIEWER") {
    return page.revisions.filter(
      (revision) => revision.reviewerId === user.id && revision.reviewStatus === "IN_REVIEW",
    );
  }
  if (user.role === "PUBLISHER") {
    return page.revisions.filter((revision) => revision.reviewStatus === "APPROVED");
  }
  const published = page.published?.revision;
  if (!published || published.items.length === 0) return [];
  const isPubliclyReadable = published.items.every(({ chunk }) => {
    const current = chunk.published?.revision;
    return current &&
      current.accessPolicy === "PUBLIC" &&
      current.language === published.language &&
      current.product === published.product &&
      current.apiVersion === published.apiVersion;
  });
  return isPubliclyReadable ? [published] : [];
}

export function serializeCmsPage(page: PageWithRevisions, user: CurrentUser) {
  const canManageTranslations = user.role === "ADMIN" || (user.role === "AUTHOR" && page.createdBy === user.id);
  return {
    id: page.id,
    slug: page.slug,
    revisions: visiblePageRevisions(page, user).map(serializePageRevision),
    publishedRevision: page.published?.revision.revision ?? null,
    translations: canManageTranslations ? page.languageGroup?.pages
      .filter((translation) => translation.id !== page.id)
      .flatMap((translation) => {
        const revision = translation.revisions[0];
        return revision
          ? [{ id: translation.id, slug: translation.slug, title: revision.title, language: revision.language, status: revision.reviewStatus }]
          : [];
      }) ?? [] : [],
  };
}

export async function listCmsPages(user: CurrentUser) {
  const pages = await db.docPage.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : user.role === "AUTHOR"
          ? { createdBy: user.id }
          : user.role === "REVIEWER"
            ? { revisions: { some: { reviewerId: user.id, reviewStatus: "IN_REVIEW" } } }
            : user.role === "PUBLISHER"
              ? { revisions: { some: { reviewStatus: "APPROVED" } } }
              : { published: { is: { revision: { items: { some: { id: { not: "" } } } } } } },
    include: pageInclude,
    orderBy: { createdAt: "desc" },
  });
  return pages
    .map((page) => serializeCmsPage(page, user))
    .filter((page) => page.revisions.length > 0);
}

export async function getCmsPage(pageId: string, user: CurrentUser) {
  const page = await db.docPage.findUnique({ where: { id: pageId }, include: pageInclude });
  if (!page) return null;
  const revisions = visiblePageRevisions(page, user);
  if (revisions.length === 0) return null;
  return {
    id: page.id,
    slug: page.slug,
    revisions: revisions.map(serializePageRevision),
    publishedRevision: page.published?.revision.revision ?? null,
    translations: page.languageGroup?.pages
      .filter((translation) => translation.id !== page.id)
      .flatMap((translation) => {
        const revision = translation.revisions[0];
        return revision
          ? [{ id: translation.id, slug: translation.slug, title: revision.title, language: revision.language, status: revision.reviewStatus }]
          : [];
      }) ?? [],
  };
}

export async function getPublishedPage(
  slug: string,
  user: CurrentUser | null,
  filters: { product?: string; apiVersion?: string; language?: string },
  includeTranslations = true,
): Promise<PublishedPageResult | null> {
  const page = await db.docPage.findUnique({
    where: { slug },
    include: {
      published: {
        include: {
          revision: {
            include: {
              items: {
                orderBy: { position: "asc" },
                include: { chunk: { include: { published: { include: { revision: true } } } } },
              },
            },
          },
        },
      },
      languageGroup: {
        include: {
          pages: {
            where: { slug: { not: slug } },
            select: {
              slug: true,
              published: {
                select: {
                  revision: {
                    select: { title: true, product: true, apiVersion: true, language: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const publication = page?.published;
  if (!page || !publication) return null;
  const revision = publication.revision;
  if (
    (filters.language && filters.language !== revision.language) ||
    (filters.product && filters.product !== revision.product) ||
    (filters.apiVersion && filters.apiVersion !== revision.apiVersion)
  ) return null;
  if (!filters.language || !filters.product || !filters.apiVersion) return null;
  if (revision.items.length === 0) return null;

  const chunks = [];
  for (const item of revision.items) {
    const chunkRevision = item.chunk.published?.revision;
    if (
      !chunkRevision ||
      chunkRevision.language !== revision.language ||
      chunkRevision.product !== revision.product ||
      chunkRevision.apiVersion !== revision.apiVersion ||
      !canAccessPublishedRevision(chunkRevision, user, filters)
    ) return null;
    chunks.push({ position: item.position, chunk: serializeRevision(chunkRevision) });
  }
  const translations = includeTranslations && page.languageGroup
    ? (await Promise.all(page.languageGroup.pages.flatMap((variant) => {
        const target = variant.published?.revision;
        if (!target) return [];
        return [getPublishedPage(variant.slug, user, {
          product: target.product,
          apiVersion: target.apiVersion,
          language: target.language,
        }, false)];
      }))).flatMap((variant) => variant ? [{
        slug: variant.slug,
        title: variant.title,
        language: variant.language,
        product: variant.product,
        apiVersion: variant.apiVersion,
      }] : [])
    : [];
  return {
    id: page.id,
    slug: page.slug,
    revision: revision.revision,
    title: revision.title,
    summary: revision.summary,
    language: revision.language,
    product: revision.product,
    apiVersion: revision.apiVersion,
    publishedAt: publication.publishedAt.toISOString(),
    chunks,
    translations,
  };
}

export async function listPublicPages() {
  const pages = await db.docPage.findMany({
    where: { published: { isNot: null } },
    select: {
      id: true,
      slug: true,
      published: {
        select: {
          publishedAt: true,
          revision: {
            select: { title: true, summary: true, language: true, product: true, apiVersion: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const visible = [];
  for (const page of pages) {
    const revision = page.published?.revision;
    if (!revision) continue;
    const publication = await getPublishedPage(page.slug, null, {
      product: revision.product,
      apiVersion: revision.apiVersion,
      language: revision.language,
    });
    if (publication) {
      visible.push({
        slug: page.slug,
        title: publication.title,
        summary: publication.summary,
        language: publication.language,
        product: publication.product,
        apiVersion: publication.apiVersion,
      });
    }
  }
  return visible;
}
