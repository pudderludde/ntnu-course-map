export interface Course {
  code: string
  name: string
  credits: number
  description: string
  prerequisites: string
  prerequisiteCodes: string[]
  equivalentCodes: string[]
  canonicalCode: string
}
