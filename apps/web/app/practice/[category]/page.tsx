import { notFound } from "next/navigation"
import { Practice } from "@/components/practice"
import { categoryIds } from "@/lib/problems/bank"
import { type Category } from "@/lib/problems/types"

export const dynamicParams = false
export function generateStaticParams() {
  return categoryIds.map(category => ({ category }))
}
export default async function PracticePage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  if (!categoryIds.includes(category as Category)) notFound()
  return <Practice key={category} category={category as Category} />
}
