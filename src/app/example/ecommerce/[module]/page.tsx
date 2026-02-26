import { notFound } from "next/navigation";

type ExampleEcommerceModulePageProps = {
  params: Promise<{
    module: string;
  }>;
};

export function generateStaticParams() {
  return [];
}

export default async function ExampleEcommerceModulePage({ params }: ExampleEcommerceModulePageProps) {
  await params;
  notFound();
}
