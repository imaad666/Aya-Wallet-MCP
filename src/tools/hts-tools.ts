import {
  Client,
  TokenCreateTransaction,
  TokenMintTransaction,
  TokenBurnTransaction,
  TransferTransaction,
  TokenId,
  AccountId,
  PrivateKey,
  Status,
  TransactionReceiptQuery,
  TokenInfoQuery,
  TokenSupplyType,
  TokenType,
  CustomFee,
  Hbar,
} from "@hashgraph/sdk";
import { Logger } from "../utils/logger.js";
import { Config } from "../config/config.js";

export class HTSTools {
  private client: Client;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("HTSTools");
    this.client = this.initializeClient();
  }

  private initializeClient(): Client {
    const config = Config.getHederaConfig();
    
    const operatorId = AccountId.fromString(config.operatorId);
    const operatorKey = PrivateKey.fromString(config.operatorKey);

    const client = Client.forName(config.network);
    client.setOperator(operatorId, operatorKey);

    this.logger.info("HTS client initialized", { network: config.network });
    return client;
  }

  /**
   * Create new HTS token
   */
  async createToken(
    name: string,
    symbol: string,
    decimals: number,
    initialSupply: string,
    treasury: string
  ): Promise<any> {
    try {
      this.logger.info("Creating HTS token", {
        name,
        symbol,
        decimals,
        initialSupply,
        treasury,
      });

      const treasuryAccount = AccountId.fromString(treasury);
      const supply = parseInt(initialSupply);

      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setDecimals(decimals)
        .setInitialSupply(supply)
        .setTreasuryAccountId(treasuryAccount)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTokenType(TokenType.FungibleCommon)
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Token creation failed with status: ${receipt.status}`);
      }

      const tokenId = receipt.tokenId;
      if (!tokenId) {
        throw new Error("Token ID not found in receipt");
      }

      const result = {
        tokenId: tokenId.toString(),
        name,
        symbol,
        decimals,
        initialSupply,
        treasury,
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("HTS token created successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to create HTS token", error);
      throw new Error(`Failed to create HTS token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mint HTS tokens
   */
  async mintToken(
    tokenId: string,
    amount: string,
    recipient: string
  ): Promise<any> {
    try {
      this.logger.info("Minting HTS tokens", {
        tokenId,
        amount,
        recipient,
      });

      const token = TokenId.fromString(tokenId);
      const mintAmount = parseInt(amount);

      const transaction = new TokenMintTransaction()
        .setTokenId(token)
        .setAmount(mintAmount)
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Token minting failed with status: ${receipt.status}`);
      }

      const result = {
        tokenId,
        amount: mintAmount.toString(),
        recipient,
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        newTotalSupply: receipt.totalSupply?.toString() || "0",
        timestamp: new Date().toISOString(),
      };

      this.logger.info("HTS tokens minted successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to mint HTS tokens", error);
      throw new Error(`Failed to mint HTS tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Burn HTS tokens
   */
  async burnToken(
    tokenId: string,
    amount: string
  ): Promise<any> {
    try {
      this.logger.info("Burning HTS tokens", {
        tokenId,
        amount,
      });

      const token = TokenId.fromString(tokenId);
      const burnAmount = parseInt(amount);

      const transaction = new TokenBurnTransaction()
        .setTokenId(token)
        .setAmount(burnAmount)
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Token burning failed with status: ${receipt.status}`);
      }

      const result = {
        tokenId,
        amount: burnAmount.toString(),
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        newTotalSupply: receipt.totalSupply?.toString() || "0",
        timestamp: new Date().toISOString(),
      };

      this.logger.info("HTS tokens burned successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to burn HTS tokens", error);
      throw new Error(`Failed to burn HTS tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transfer HTS tokens
   */
  async transferToken(
    tokenId: string,
    fromAccount: string,
    toAccount: string,
    amount: string
  ): Promise<any> {
    try {
      this.logger.info("Transferring HTS tokens", {
        tokenId,
        fromAccount,
        toAccount,
        amount,
      });

      const token = TokenId.fromString(tokenId);
      const from = AccountId.fromString(fromAccount);
      const to = AccountId.fromString(toAccount);
      const transferAmount = parseInt(amount);

      const transaction = new TransferTransaction()
        .addTokenTransfer(token, from, -transferAmount)
        .addTokenTransfer(token, to, transferAmount)
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`Token transfer failed with status: ${receipt.status}`);
      }

      const result = {
        tokenId,
        fromAccount,
        toAccount,
        amount: transferAmount.toString(),
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("HTS tokens transferred successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to transfer HTS tokens", error);
      throw new Error(`Failed to transfer HTS tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get token information
   */
  async getTokenInfo(tokenId: string): Promise<any> {
    try {
      this.logger.info("Getting token info", { tokenId });

      const token = TokenId.fromString(tokenId);
      const query = new TokenInfoQuery().setTokenId(token);
      const tokenInfo = await query.execute(this.client);

      const result = {
        tokenId: tokenInfo.tokenId.toString(),
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        totalSupply: tokenInfo.totalSupply?.toString() || "0",
        treasury: tokenInfo.treasuryAccountId?.toString(),
        adminKey: tokenInfo.adminKey ? "Present" : "None",
        kycKey: tokenInfo.kycKey ? "Present" : "None",
        freezeKey: tokenInfo.freezeKey ? "Present" : "None",
        supplyKey: tokenInfo.supplyKey ? "Present" : "None",
        wipeKey: tokenInfo.wipeKey ? "Present" : "None",
        pauseKey: tokenInfo.pauseKey ? "Present" : "None",
        autoRenewAccount: tokenInfo.autoRenewAccountId?.toString(),
        autoRenewPeriod: tokenInfo.autoRenewPeriod?.toString(),
        expiry: tokenInfo.expirationTime?.toString(),
        memo: "", // TokenInfo doesn't have memo property
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Token info retrieved successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get token info", error);
      throw new Error(`Failed to get token info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create NFT token
   */
  async createNFTToken(
    name: string,
    symbol: string,
    treasury: string,
    metadata: string[]
  ): Promise<any> {
    try {
      this.logger.info("Creating NFT token", {
        name,
        symbol,
        treasury,
        metadataCount: metadata.length,
      });

      const treasuryAccount = AccountId.fromString(treasury);

      const transaction = new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryAccount)
        .setSupplyType(TokenSupplyType.Infinite)
        .setTokenType(TokenType.NonFungibleUnique)
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`NFT token creation failed with status: ${receipt.status}`);
      }

      const tokenId = receipt.tokenId;
      if (!tokenId) {
        throw new Error("Token ID not found in receipt");
      }

      const result = {
        tokenId: tokenId.toString(),
        name,
        symbol,
        treasury,
        metadataCount: metadata.length,
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("NFT token created successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to create NFT token", error);
      throw new Error(`Failed to create NFT token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mint NFT
   */
  async mintNFT(
    tokenId: string,
    metadata: string
  ): Promise<any> {
    try {
      this.logger.info("Minting NFT", {
        tokenId,
        metadata,
      });

      const token = TokenId.fromString(tokenId);

      const transaction = new TokenMintTransaction()
        .setTokenId(token)
        .setMetadata([Buffer.from(metadata, "utf8")])
        .setMaxTransactionFee(new Hbar(2));

      const response = await transaction.execute(this.client);
      const receipt = await new TransactionReceiptQuery()
        .setTransactionId(response.transactionId)
        .execute(this.client);

      if (receipt.status !== Status.Success) {
        throw new Error(`NFT minting failed with status: ${receipt.status}`);
      }

      const result = {
        tokenId,
        serialNumber: "0", // Mock serial number since serialNumbers is not available
        metadata,
        transactionId: response.transactionId.toString(),
        status: receipt.status.toString(),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("NFT minted successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to mint NFT", error);
      throw new Error(`Failed to mint NFT: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 