export interface Product {
  id: string
  priceId: string
  name: string
  description: string
  mode: 'payment' | 'subscription'
}

export const products: Product[] = [
  {
    id: 'prod_SaTZsp7fdLQ5oG',
    priceId: 'price_1RfIc7P5IgjXtTnFWWG0WZnv',
    name: 'MoneyTalk Pro',
    description: '- No need to add OpenAI Api Key',
    mode: 'subscription'
  }
]