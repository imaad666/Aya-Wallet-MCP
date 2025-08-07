#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { HederaDeFiTools } from "./tools/hedera-defi-tools.js";
import { SaucerSwapTools } from "./tools/saucerswap-tools.js";
import { HTSTools } from "./tools/hts-tools.js";
import { DeFiAggregator } from "./tools/defi-aggregator.js";
import { Logger } from "./utils/logger.js";
import { Config } from "./config/config.js";

class AyaWalletMCPServer {
  private server: Server;
  private hederaTools: HederaDeFiTools;
  private saucerSwapTools: SaucerSwapTools;
  private htsTools: HTSTools;
  private defiAggregator: DeFiAggregator;
  private logger: Logger;

  constructor() {
    this.logger = new Logger("AyaWalletMCPServer");
    this.server = new Server({
      name: "aya-wallet-mcp",
      version: "1.0.0",
    });

    // Initialize tools
    this.hederaTools = new HederaDeFiTools();
    this.saucerSwapTools = new SaucerSwapTools();
    this.htsTools = new HTSTools();
    this.defiAggregator = new DeFiAggregator();

    this.setupRequestHandlers();
  }

  private setupRequestHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.info("Listing available tools");
      return {
        tools: [
          // Hedera DeFi Tools
          {
            name: "hedera_get_balance",
            description: "Get HBAR balance for a Hedera account",
            inputSchema: {
              type: "object",
              properties: {
                accountId: { type: "string", description: "Hedera account ID" }
              },
              required: ["accountId"]
            }
          },
          {
            name: "hedera_transfer_hbar",
            description: "Transfer HBAR between Hedera accounts",
            inputSchema: {
              type: "object",
              properties: {
                fromAccountId: { type: "string" },
                toAccountId: { type: "string" },
                amount: { type: "string" },
                memo: { type: "string" }
              },
              required: ["fromAccountId", "toAccountId", "amount"]
            }
          },
          // SaucerSwap Tools
          {
            name: "saucerswap_get_quote",
            description: "Get swap quote from SaucerSwap",
            inputSchema: {
              type: "object",
              properties: {
                tokenIn: { type: "string" },
                tokenOut: { type: "string" },
                amount: { type: "string" },
                slippageTolerance: { type: "number", default: 0.5 }
              },
              required: ["tokenIn", "tokenOut", "amount"]
            }
          },
          {
            name: "saucerswap_execute_swap",
            description: "Execute token swap on SaucerSwap",
            inputSchema: {
              type: "object",
              properties: {
                tokenIn: { type: "string" },
                tokenOut: { type: "string" },
                amount: { type: "string" },
                slippageTolerance: { type: "number", default: 0.5 },
                recipient: { type: "string" }
              },
              required: ["tokenIn", "tokenOut", "amount", "recipient"]
            }
          },
          {
            name: "saucerswap_add_liquidity",
            description: "Add liquidity to SaucerSwap pool",
            inputSchema: {
              type: "object",
              properties: {
                tokenA: { type: "string" },
                tokenB: { type: "string" },
                amountA: { type: "string" },
                amountB: { type: "string" },
                slippageTolerance: { type: "number", default: 0.5 }
              },
              required: ["tokenA", "tokenB", "amountA", "amountB"]
            }
          },
          // HTS Tools
          {
            name: "hts_create_token",
            description: "Create new HTS token",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                symbol: { type: "string" },
                decimals: { type: "number" },
                initialSupply: { type: "string" },
                treasury: { type: "string" }
              },
              required: ["name", "symbol", "decimals", "initialSupply", "treasury"]
            }
          },
          {
            name: "hts_mint_token",
            description: "Mint HTS tokens",
            inputSchema: {
              type: "object",
              properties: {
                tokenId: { type: "string" },
                amount: { type: "string" },
                recipient: { type: "string" }
              },
              required: ["tokenId", "amount", "recipient"]
            }
          },
          // DeFi Aggregator Tools
          {
            name: "defi_find_best_rate",
            description: "Find best swap rate across multiple DEXs",
            inputSchema: {
              type: "object",
              properties: {
                tokenIn: { type: "string" },
                tokenOut: { type: "string" },
                amount: { type: "string" }
              },
              required: ["tokenIn", "tokenOut", "amount"]
            }
          },
          {
            name: "defi_optimize_portfolio",
            description: "Optimize DeFi portfolio for maximum yield",
            inputSchema: {
              type: "object",
              properties: {
                walletAddress: { type: "string" },
                riskTolerance: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["walletAddress"]
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.info(`Tool call: ${name}`, args);

      try {
        let result: any;

        // Type guard to ensure args exists
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments provided');
        }

        switch (name) {
          // Hedera DeFi Tools
          case "hedera_get_balance":
            result = await this.hederaTools.getBalance(args.accountId as string);
            break;
          case "hedera_transfer_hbar":
            result = await this.hederaTools.transferHBAR(
              args.fromAccountId as string,
              args.toAccountId as string,
              args.amount as string,
              args.memo as string
            );
            break;

          // SaucerSwap Tools
          case "saucerswap_get_quote":
            result = await this.saucerSwapTools.getQuote(
              args.tokenIn as string,
              args.tokenOut as string,
              args.amount as string,
              args.slippageTolerance as number
            );
            break;
          case "saucerswap_execute_swap":
            result = await this.saucerSwapTools.executeSwap(
              args.tokenIn as string,
              args.tokenOut as string,
              args.amount as string,
              args.slippageTolerance as number,
              args.recipient as string
            );
            break;
          case "saucerswap_add_liquidity":
            result = await this.saucerSwapTools.addLiquidity(
              args.tokenA as string,
              args.tokenB as string,
              args.amountA as string,
              args.amountB as string,
              args.slippageTolerance as number
            );
            break;

          // HTS Tools
          case "hts_create_token":
            result = await this.htsTools.createToken(
              args.name as string,
              args.symbol as string,
              args.decimals as number,
              args.initialSupply as string,
              args.treasury as string
            );
            break;
          case "hts_mint_token":
            result = await this.htsTools.mintToken(
              args.tokenId as string,
              args.amount as string,
              args.recipient as string
            );
            break;

          // DeFi Aggregator Tools
          case "defi_find_best_rate":
            result = await this.defiAggregator.findBestRate(
              args.tokenIn as string,
              args.tokenOut as string,
              args.amount as string
            );
            break;
          case "defi_optimize_portfolio":
            result = await this.defiAggregator.optimizePortfolio(
              args.walletAddress as string,
              args.riskTolerance as string
            );
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        this.logger.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ]
        };
      }
    });
  }

  async start() {
    try {
      await Config.load();
      this.logger.info("Starting Aya Wallet MCP Server...");
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.logger.info("MCP Server started successfully");
    } catch (error) {
      this.logger.error("Failed to start MCP server:", error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new AyaWalletMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
}); 