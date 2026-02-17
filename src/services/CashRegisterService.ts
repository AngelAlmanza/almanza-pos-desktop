import { invoke } from "@tauri-apps/api/core";
import type {
  CloseCashRegisterDTO,
  DateRangeDTO,
  OpenCashRegisterDTO,
} from "../dto";
import type { CashRegisterSession, CashRegisterSummary } from "../models";

export class CashRegisterService {
  static async getAll(): Promise<CashRegisterSession[]> {
    return invoke<CashRegisterSession[]>("get_cash_register_sessions");
  }

  static async getByDateRange(
    dto: DateRangeDTO,
  ): Promise<CashRegisterSession[]> {
    return invoke<CashRegisterSession[]>(
      "get_cash_register_sessions_by_date_range",
      { request: dto },
    );
  }

  static async getById(id: number): Promise<CashRegisterSession> {
    return invoke<CashRegisterSession>("get_cash_register_session", { id });
  }

  static async getOpen(): Promise<CashRegisterSession | null> {
    return invoke<CashRegisterSession | null>("get_open_cash_register");
  }

  static async getOpenByUser(
    userId: number,
  ): Promise<CashRegisterSession | null> {
    return invoke<CashRegisterSession | null>(
      "get_open_cash_register_by_user",
      { userId },
    );
  }

  static async open(dto: OpenCashRegisterDTO): Promise<CashRegisterSession> {
    return invoke<CashRegisterSession>("open_cash_register", { request: dto });
  }

  static async close(dto: CloseCashRegisterDTO): Promise<CashRegisterSummary> {
    return invoke<CashRegisterSummary>("close_cash_register", { request: dto });
  }

  static async getSummary(sessionId: number): Promise<CashRegisterSummary> {
    return invoke<CashRegisterSummary>("get_cash_register_summary", {
      sessionId,
    });
  }
}
