import axios from "axios";
import { ethers } from "ethers";
import { Logger } from "../utils/logger.js";
import { Config } from "../config/config.js";

// SaucerSwap ABI snippets for common operations
const SAUCERSWAP_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
];

export class SaucerSwapTools {
  private logger: Logger;
  private config: any;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.logger = new Logger("SaucerSwapTools");
    this.config = Config.getSaucerSwapConfig();
    this.provider = new ethers.JsonRpcProvider(this.getRpcUrl());
  }

  private getRpcUrl(): string {
    const network = this.config.network;
    return network === "mainnet" 
      ? "https://mainnet.hashio.io/api"
      : "https://testnet.hashio.io/api";
  }

  /**
   * Get swap quote from SaucerSwap
   */
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    slippageTolerance: number = 0.5
  ): Promise<any> {
    try {
      this.logger.saucerSwapOperation("get_quote", tokenIn, tokenOut, {
        amount,
        slippageTolerance,
      });

      // Get token information
      const tokenInInfo = await this.getTokenInfo(tokenIn);
      const tokenOutInfo = await this.getTokenInfo(tokenOut);

      // Calculate expected output
      const amountIn = ethers.parseUnits(amount, tokenInInfo.decimals);
      const path = [tokenIn, tokenOut];
      
      const routerContract = new ethers.Contract(
        this.config.routerAddress,
        SAUCERSWAP_ROUTER_ABI,
        this.provider
      );

      const amounts = await routerContract.getAmountsOut(amountIn, path);
      const amountOut = amounts[1];
      const amountOutMin = amountOut * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);

      const result = {
        tokenIn: {
          address: tokenIn,
          symbol: tokenInInfo.symbol,
          amount: amount,
          amountWei: amountIn.toString(),
        },
        tokenOut: {
          address: tokenOut,
          symbol: tokenOutInfo.symbol,
          expectedAmount: ethers.formatUnits(amountOut, tokenOutInfo.decimals),
          amountWei: amountOut.toString(),
          minimumAmount: ethers.formatUnits(amountOutMin, tokenOutInfo.decimals),
        },
        priceImpact: this.calculatePriceImpact(amountIn, amountOut, tokenInInfo, tokenOutInfo),
        slippageTolerance,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Quote retrieved successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get quote", error);
      throw new Error(`Failed to get quote: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute token swap on SaucerSwap
   */
  async executeSwap(
    tokenIn: string,
    tokenOut: string,
    amount: string,
    slippageTolerance: number = 0.5,
    recipient: string
  ): Promise<any> {
    try {
      this.logger.saucerSwapOperation("execute_swap", tokenIn, tokenOut, {
        amount,
        slippageTolerance,
        recipient,
      });

      // Get quote first
      const quote = await this.getQuote(tokenIn, tokenOut, amount, slippageTolerance);
      
      // Build transaction
      const routerContract = new ethers.Contract(
        this.config.routerAddress,
        SAUCERSWAP_ROUTER_ABI,
        this.provider
      );

      const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
      const path = [tokenIn, tokenOut];
      const amountIn = ethers.parseUnits(amount, quote.tokenIn.symbol === "HBAR" ? 8 : 18);
      const amountOutMin = ethers.parseUnits(quote.tokenOut.minimumAmount, quote.tokenOut.symbol === "HBAR" ? 8 : 18);

      const swapData = routerContract.interface.encodeFunctionData("swapExactTokensForTokens", [
        amountIn,
        amountOutMin,
        path,
        recipient,
        deadline,
      ]);

      const result = {
        transaction: {
          to: this.config.routerAddress,
          data: swapData,
          value: tokenIn.toLowerCase() === "0x0000000000000000000000000000000000000000" ? amountIn : "0",
        },
        quote,
        recipient,
        deadline,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Swap transaction built successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to execute swap", error);
      throw new Error(`Failed to execute swap: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add liquidity to SaucerSwap pool
   */
  async addLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    slippageTolerance: number = 0.5
  ): Promise<any> {
    try {
      this.logger.saucerSwapOperation("add_liquidity", tokenA, tokenB, {
        amountA,
        amountB,
        slippageTolerance,
      });

      const tokenAInfo = await this.getTokenInfo(tokenA);
      const tokenBInfo = await this.getTokenInfo(tokenB);

      const routerContract = new ethers.Contract(
        this.config.routerAddress,
        SAUCERSWAP_ROUTER_ABI,
        this.provider
      );

      const amountADesired = ethers.parseUnits(amountA, tokenAInfo.decimals);
      const amountBDesired = ethers.parseUnits(amountB, tokenBInfo.decimals);
      const amountAMin = amountADesired * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);
      const amountBMin = amountBDesired * BigInt(Math.floor((100 - slippageTolerance) * 100)) / BigInt(10000);

      const deadline = Math.floor(Date.now() / 1000) + 1200;

      const addLiquidityData = routerContract.interface.encodeFunctionData("addLiquidity", [
        tokenA,
        tokenB,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        this.config.operatorId, // recipient
        deadline,
      ]);

      const result = {
        transaction: {
          to: this.config.routerAddress,
          data: addLiquidityData,
          value: "0",
        },
        pool: {
          tokenA: {
            address: tokenA,
            symbol: tokenAInfo.symbol,
            amount: amountA,
            amountWei: amountADesired.toString(),
            minimumAmount: ethers.formatUnits(amountAMin, tokenAInfo.decimals),
          },
          tokenB: {
            address: tokenB,
            symbol: tokenBInfo.symbol,
            amount: amountB,
            amountWei: amountBDesired.toString(),
            minimumAmount: ethers.formatUnits(amountBMin, tokenBInfo.decimals),
          },
        },
        slippageTolerance,
        deadline,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Add liquidity transaction built successfully", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to add liquidity", error);
      throw new Error(`Failed to add liquidity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(tokenA: string, tokenB: string): Promise<any> {
    try {
      this.logger.saucerSwapOperation("get_pool_info", tokenA, tokenB);

      const tokenAInfo = await this.getTokenInfo(tokenA);
      const tokenBInfo = await this.getTokenInfo(tokenB);

      // Get pool reserves (simplified - in real implementation, you'd query the pool contract)
      const result = {
        pool: {
          tokenA: {
            address: tokenA,
            symbol: tokenAInfo.symbol,
            decimals: tokenAInfo.decimals,
          },
          tokenB: {
            address: tokenB,
            symbol: tokenBInfo.symbol,
            decimals: tokenBInfo.decimals,
          },
        },
        reserves: {
          tokenAReserve: "0", // Would be fetched from pool contract
          tokenBReserve: "0", // Would be fetched from pool contract
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Pool info retrieved", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get pool info", error);
      throw new Error(`Failed to get pool info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get yield farming opportunities
   */
  async getYieldFarmingOpportunities(): Promise<any> {
    try {
      this.logger.info("Getting yield farming opportunities");

      // Mock data - in real implementation, you'd query SaucerSwap's farming contracts
      const opportunities = [
        {
          pool: "HBAR-USDC",
          apy: "12.5%",
          tvl: "$1,234,567",
          rewards: ["SAUCE", "HBAR"],
          risk: "medium",
        },
        {
          pool: "HBAR-USDT",
          apy: "15.2%",
          tvl: "$2,345,678",
          rewards: ["SAUCE"],
          risk: "low",
        },
        {
          pool: "USDC-USDT",
          apy: "8.7%",
          tvl: "$3,456,789",
          rewards: ["SAUCE"],
          risk: "very_low",
        },
      ];

      const result = {
        opportunities,
        totalTVL: "$7,037,034",
        averageAPY: "12.1%",
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Yield farming opportunities retrieved", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get yield farming opportunities", error);
      throw new Error(`Failed to get yield farming opportunities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get token information
   */
  private async getTokenInfo(tokenAddress: string): Promise<any> {
    // Mock token info - in real implementation, you'd query token contracts
    const tokenInfo: { [key: string]: any } = {
      "0x0000000000000000000000000000000000000000": {
        symbol: "HBAR",
        name: "Hedera",
        decimals: 8,
      },
      "0x0000000000000000000000000000000000000001": {
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
      "0x0000000000000000000000000000000000000002": {
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
      },
    };

    return tokenInfo[tokenAddress.toLowerCase()] || {
      symbol: "UNKNOWN",
      name: "Unknown Token",
      decimals: 18,
    };
  }

  /**
   * Calculate price impact
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    tokenInInfo: any,
    tokenOutInfo: any
  ): string {
    // Simplified price impact calculation
    const impact = (Number(amountIn) / 1e18) * 0.001; // Mock calculation
    return `${(impact * 100).toFixed(2)}%`;
  }
} 