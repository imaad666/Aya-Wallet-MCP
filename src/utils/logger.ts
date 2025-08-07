import { Config } from "../config/config.js";

export class Logger {
  private context: string;
  private logLevel: string;

  constructor(context: string) {
    this.context = context;
    this.logLevel = process.env.LOG_LEVEL || "info";
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
    
    if (data) {
      return `${baseMessage}\n${JSON.stringify(data, null, 2)}`;
    }
    
    return baseMessage;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog("error")) {
      const errorData = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(this.formatMessage("error", message, errorData));
    }
  }

  // Specialized logging for Hedera operations
  hederaOperation(operation: string, accountId: string, data?: any): void {
    this.info(`Hedera ${operation}`, { accountId, ...data });
  }

  // Specialized logging for SaucerSwap operations
  saucerSwapOperation(operation: string, tokenIn: string, tokenOut: string, data?: any): void {
    this.info(`SaucerSwap ${operation}`, { tokenIn, tokenOut, ...data });
  }

  // Specialized logging for MCP tool calls
  toolCall(toolName: string, args: any, result?: any): void {
    this.info(`MCP Tool Call: ${toolName}`, { args, result });
  }
} 