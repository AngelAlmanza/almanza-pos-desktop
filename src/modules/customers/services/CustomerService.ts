import { invoke } from '@tauri-apps/api/core';
import type {
  CreateCustomerDTO,
  CreateCustomerPaymentDTO,
  Customer,
  CustomerAccountMovement,
  UpdateCustomerDTO,
} from '@modules/customers/types';

export class CustomerService {
  static async getAll(): Promise<Customer[]> {
    return invoke<Customer[]>('get_customers');
  }

  static async getActive(): Promise<Customer[]> {
    return invoke<Customer[]>('get_active_customers');
  }

  static async getById(id: number): Promise<Customer> {
    return invoke<Customer>('get_customer', { id });
  }

  static async create(dto: CreateCustomerDTO): Promise<Customer> {
    return invoke<Customer>('create_customer', { request: dto });
  }

  static async update(dto: UpdateCustomerDTO): Promise<Customer> {
    return invoke<Customer>('update_customer', { request: dto });
  }

  static async getMovements(customerId: number): Promise<CustomerAccountMovement[]> {
    return invoke<CustomerAccountMovement[]>('get_customer_movements', { customerId });
  }

  static async registerPayment(dto: CreateCustomerPaymentDTO): Promise<CustomerAccountMovement> {
    return invoke<CustomerAccountMovement>('register_customer_payment', { request: dto });
  }
}
