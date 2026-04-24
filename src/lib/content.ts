import { aiProducts, frameworks, initiatives, type AIProduct, type Framework, type Initiative } from "@/data";

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function getInitiativeById(id: string) {
  return initiatives.find((initiative) => initiative.id === id);
}

export function getFrameworkById(id: string) {
  return frameworks.find((framework) => framework.id === id);
}

export function getAIProductById(id: string) {
  return aiProducts.find((product) => product.id === id);
}

export function getRelatedFrameworks(ids: string[]) {
  return ids.map(getFrameworkById).filter(isDefined) satisfies Framework[];
}

export function getRelatedProducts(ids: string[]) {
  return ids.map(getAIProductById).filter(isDefined) satisfies AIProduct[];
}

export function getRelatedInitiatives(ids: string[]) {
  return ids.map(getInitiativeById).filter(isDefined) satisfies Initiative[];
}
