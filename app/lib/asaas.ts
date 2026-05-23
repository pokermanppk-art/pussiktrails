import axios from 'axios'

const getBaseUrl = () => {
  const env = process.env.ASAAS_ENV || 'sandbox'
  return env === 'production' 
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3'
}

export const asaasClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY,
  },
})

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
  mobilePhone?: string
}

export interface AsaasPayment {
  id: string
  customer: string
  value: number
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD'
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED'
  dueDate: string
  description?: string
  invoiceUrl?: string
}

export interface AsaasPixQrCode {
  encodedImage: string
  payload: string
}

export const asaas = {
  customers: {
    create: async (data: {
      name: string
      email: string
      cpfCnpj: string
      mobilePhone?: string
    }): Promise<AsaasCustomer> => {
      const response = await asaasClient.post('/customers', data)
      return response.data
    },
    
    get: async (id: string): Promise<AsaasCustomer> => {
      const response = await asaasClient.get(`/customers/${id}`)
      return response.data
    },
    
    list: async (params?: { cpfCnpj?: string }): Promise<{ data: AsaasCustomer[] }> => {
      const response = await asaasClient.get('/customers', { params })
      return response.data
    },
  },

  payments: {
    create: async (data: {
      customer: string
      billingType: 'PIX'
      value: number
      dueDate: string
      description?: string
      externalReference?: string
    }): Promise<AsaasPayment> => {
      const response = await asaasClient.post('/payments', data)
      return response.data
    },

    get: async (id: string): Promise<AsaasPayment> => {
      const response = await asaasClient.get(`/payments/${id}`)
      return response.data
    },

    getPixQrCode: async (paymentId: string): Promise<AsaasPixQrCode> => {
      const response = await asaasClient.get(`/payments/${paymentId}/pixQrCode`)
      return response.data
    },
  },

  webhooks: {
    create: async (data: {
      name: string
      url: string
      email: string
      enabled: boolean
      events: string[]
      sendType: 'SEQUENTIALLY'
    }) => {
      const response = await asaasClient.post('/webhooks', data)
      return response.data
    },
  },
}