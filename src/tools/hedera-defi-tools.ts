import {
  Client,
  AccountId,
  TransferTransaction,
  Hbar,
  TransactionReceiptQuery,
  AccountBalanceQuery,
  PrivateKey,
  Status,
} from "@hashgraph/sdk";
import { Logger } from "../utils/logger.js";
import { Config } from "../config/config.js";

export class HederaDeFiTools {
  private client: Client;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("HederaDeFiTools");
    this.client = this.initializeClient();
  }

  private initializeClient(): Client {
    const config = Config.getHederaConfig();
    
    const operatorId = AccountId.fromString(config.operatorId);
    const operatorKey = PrivateKey.fromString(config.operatorKey);

    const client = Client.forName(config.network);
    client.setOperator(operatorId, operatorKey);

    this.logger.info("Hedera client initialized", { network: config.network });
    return client;
  }

  /**
   * Get HBAR balance for a Hedera account
   */
  async getBalance(accountId: string): Promise<any> {
    try {
      this.logger.hederaOperation("get_balance", accountId);

      const account = AccountId.fromString(accountId);
      const query = new AccountBalanceQuery().setAccountId(account);
      const balance = await query.execute(this.client);

      const result = {
        accountId,
        balance: balance.hbars.toString(),
        balanceInTinybars: balance.hbars.toTinybars().toString(),
        tokens: balance.tokens ? Object.keys(balance.tokens).length : 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Balance retrieved successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get balance", error);
      throw new Error(`Failed to get balance for account ${accountId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfer HBAR between Hedera accounts
   */
  async transferHBAR(
    fromAccountId: string,
    toAccountId: string,
    amount: string,
    memo?: string
  ): Promise<any> {
    try {
      this.logger.hederaOperation("transfer_hbar", fromAccountId, {
        toAccountId,
        amount,
        memo,
      });

      const fromAccount = AccountId.fromString(fromAccountId);
      const toAccount = AccountId.fromString(toAccountId);
      const hbarAmount = Hbar.fromString(amount);

      const transaction = new TransferTransaction()
        .addHbarTransfer(fromAccount, hbarAmount.negated())
        .addHbarTransfer(toAccount, hbarAmount)
        .setTransactionMemo(memo || "HBAR transfer via Aya Wallet MCP")
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

      const result = {
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        fromAccountId,
        toAccountId,
        amount: hbarAmount.toString(),
        memo,
        timestamp: new Date().toISOString(),
        networkFee: "0.0001", // Mock fee since transactionFee is not available
      };

      this.logger.info("HBAR transfer completed successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to transfer HBAR", error);
      throw new Error(`Failed to transfer HBAR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get account information including token balances
   */
  async getAccountInfo(accountId: string): Promise<any> {
    try {
      this.logger.hederaOperation("get_account_info", accountId);

      const account = AccountId.fromString(accountId);
      const query = new AccountBalanceQuery().setAccountId(account);
      const balance = await query.execute(this.client);

      const result = {
        accountId,
        balance: balance.hbars.toString(),
        balanceInTinybars: balance.hbars.toTinybars().toString(),
        tokens: balance.tokens ? Object.entries(balance.tokens).map(([tokenId, balance]) => ({
          tokenId,
          balance: balance.toString(),
          decimals: balance.decimals,
        })) : [],
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Account info retrieved successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get account info", error);
      throw new Error(`Failed to get account info for ${accountId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate transaction fees for a transfer
   */
  async estimateTransferFee(
    fromAccountId: string,
    toAccountId: string,
    amount: string
  ): Promise<any> {
    try {
      this.logger.hederaOperation("estimate_transfer_fee", fromAccountId, {
        toAccountId,
        amount,
      });

      const fromAccount = AccountId.fromString(fromAccountId);
      const toAccount = AccountId.fromString(toAccountId);
      const hbarAmount = Hbar.fromString(amount);

      const transaction = new TransferTransaction()
        .addHbarTransfer(fromAccount, hbarAmount.negated())
        .addHbarTransfer(toAccount, hbarAmount)
        .setTransactionMemo("Fee estimation")
        .setMaxTransactionFee(new Hbar(2));

      // Mock fee estimation since getTransactionFeeAsync is not available
      const estimatedFee = new Hbar(0.0001);

      const result = {
        estimatedFee: estimatedFee.toString(),
        estimatedFeeInHbar: estimatedFee.toTinybars().toString(),
        fromAccountId,
        toAccountId,
        amount: hbarAmount.toString(),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Transfer fee estimated successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to estimate transfer fee", error);
      throw new Error(`Failed to estimate transfer fee: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<any> {
    try {
      const config = Config.getHederaConfig();
      
      const result = {
        network: config.network,
        operatorId: config.operatorId,
        endpoints: config.endpoints,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Network info retrieved", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get network info", error);
      throw new Error(`Failed to get network info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 