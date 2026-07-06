import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_GLOSSARY_TERMS, getTermBySlug } from "@/lib/academy/glossary/registry";
import GlossaryTermView from "@/components/academy/GlossaryTermView";

interface Props {
  params: Promise<{ term: string }>;
}

export async function generateStaticParams() {
  return ALL_GLOSSARY_TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { term: slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) return {};

  return {
    title: `${term.term.en}${term.abbreviation ? ` (${term.abbreviation})` : ""} | Economic Glossary`,
    description: term.definition.en,
    openGraph: {
      title: term.term.en,
      description: term.definition.en,
    },
    other: {
      "application/ld+json": JSON.stringify({
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        name: term.term.en,
        description: term.definition.en,
        inDefinedTermSet: {
          "@type": "DefinedTermSet",
          name: "Pakistan Economy Dashboard — Economic Glossary",
        },
      }),
    },
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { term: slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) notFound();

  return (
    <main className="px-4 sm:px-6">
      <GlossaryTermView term={term} />
    </main>
  );
}
