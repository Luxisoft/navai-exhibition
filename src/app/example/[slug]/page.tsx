import { notFound } from "next/navigation";

type ExamplePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return [];
}

export default async function ExampleDetailPage({ params }: ExamplePageProps) {
  await params;
  notFound();
}
