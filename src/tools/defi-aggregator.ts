import axios from "axios";
import { Logger } from "../utils/logger.js";
import { Config } from "../config/config.js";
import { SaucerSwapTools } from "./saucerswap-tools.js";

export class DeFiAggregator {
  private logger: Logger;
  private saucerSwapTools: SaucerSwapTools;

  constructor() {
    this.logger = new Logger("DeFiAggregator");
    this.saucerSwapTools = new SaucerSwapTools();
  }

  /**
   * Find best swap rate across multiple DEXs
   */
  async findBestRate(
    tokenIn: string,
    tokenOut: string,
    amount: string
  ): Promise<any> {
    try {
      this.logger.info("Finding best rate across DEXs", {
        tokenIn,
        tokenOut,
        amount,
      });

      const quotes = await Promise.allSettled([
        this.getSaucerSwapQuote(tokenIn, tokenOut, amount),
        this.getHeliSwapQuote(tokenIn, tokenOut, amount),
        this.getPangolinQuote(tokenIn, tokenOut, amount),
      ]);

      const validQuotes = quotes
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === "fulfilled" && result.value
        )
        .map(result => result.value);

      if (validQuotes.length === 0) {
        throw new Error("No valid quotes found from any DEX");
      }

      // Sort by best rate (highest output amount)
      validQuotes.sort((a, b) => {
        const aAmount = parseFloat(a.tokenOut.expectedAmount);
        const bAmount = parseFloat(b.tokenOut.expectedAmount);
        return bAmount - aAmount;
      });

      const bestQuote = validQuotes[0];
      const averageRate = validQuotes.reduce((sum, quote) => 
        sum + parseFloat(quote.tokenOut.expectedAmount), 0
      ) / validQuotes.length;

      const result = {
        bestQuote,
        allQuotes: validQuotes,
        averageRate: averageRate.toFixed(6),
        savings: (parseFloat(bestQuote.tokenOut.expectedAmount) - averageRate).toFixed(6),
        dexCount: validQuotes.length,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Best rate found", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to find best rate", error);
      throw new Error(`Failed to find best rate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize DeFi portfolio for maximum yield
   */
  async optimizePortfolio(
    walletAddress: string,
    riskTolerance: string = "medium"
  ): Promise<any> {
    try {
      this.logger.info("Optimizing portfolio", {
        walletAddress,
        riskTolerance,
      });

      // Get current portfolio
      const currentPortfolio = await this.getCurrentPortfolio(walletAddress);
      
      // Get yield opportunities
      const yieldOpportunities = await this.getYieldOpportunities(riskTolerance);
      
      // Calculate optimal allocation
      const optimalAllocation = this.calculateOptimalAllocation(
        currentPortfolio,
        yieldOpportunities,
        riskTolerance
      );

      const result = {
        currentPortfolio,
        yieldOpportunities,
        optimalAllocation,
        riskTolerance,
        estimatedAPY: this.calculateEstimatedAPY(optimalAllocation),
        rebalanceActions: this.generateRebalanceActions(currentPortfolio, optimalAllocation),
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Portfolio optimization completed", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to optimize portfolio", error);
      throw new Error(`Failed to optimize portfolio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get arbitrage opportunities across DEXs
   */
  async findArbitrageOpportunities(
    tokenA: string,
    tokenB: string,
    minProfitThreshold: number = 0.5
  ): Promise<any> {
    try {
      this.logger.info("Finding arbitrage opportunities", {
        tokenA,
        tokenB,
        minProfitThreshold,
      });

      const opportunities = [];

      // Check for arbitrage between different DEXs
      const dexPairs = [
        { dex1: "SaucerSwap", dex2: "HeliSwap" },
        { dex1: "SaucerSwap", dex2: "Pangolin" },
        { dex1: "HeliSwap", dex2: "Pangolin" },
      ];

      for (const pair of dexPairs) {
        const quote1 = await this.getQuoteFromDEX(pair.dex1, tokenA, tokenB, "1000");
        const quote2 = await this.getQuoteFromDEX(pair.dex2, tokenB, tokenA, quote1.tokenOut.expectedAmount);

        const profit = parseFloat(quote2.tokenOut.expectedAmount) - 1000;
        const profitPercentage = (profit / 1000) * 100;

        if (profitPercentage >= minProfitThreshold) {
          opportunities.push({
            dex1: pair.dex1,
            dex2: pair.dex2,
            tokenA,
            tokenB,
            initialAmount: "1000",
            finalAmount: quote2.tokenOut.expectedAmount,
            profit,
            profitPercentage,
            route: `${tokenA} → ${tokenB} (${pair.dex1}) → ${tokenA} (${pair.dex2})`,
          });
        }
      }

      const result = {
        opportunities,
        totalOpportunities: opportunities.length,
        averageProfit: opportunities.length > 0 
          ? opportunities.reduce((sum, opp) => sum + opp.profitPercentage, 0) / opportunities.length 
          : 0,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Arbitrage opportunities found", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to find arbitrage opportunities", error);
      throw new Error(`Failed to find arbitrage opportunities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get yield farming strategies
   */
  async getYieldFarmingStrategies(): Promise<any> {
    try {
      this.logger.info("Getting yield farming strategies");

      const strategies = [
        {
          name: "SaucerSwap HBAR-USDC LP",
          apy: "12.5%",
          risk: "medium",
          tvl: "$1,234,567",
          rewards: ["SAUCE", "HBAR"],
          requirements: ["Provide HBAR-USDC liquidity"],
          strategy: "Stake LP tokens in SaucerSwap farm",
        },
        {
          name: "HeliSwap HBAR-USDT LP",
          apy: "15.2%",
          risk: "medium",
          tvl: "$2,345,678",
          rewards: ["HELI"],
          requirements: ["Provide HBAR-USDT liquidity"],
          strategy: "Stake LP tokens in HeliSwap farm",
        },
        {
          name: "Pangolin HBAR-ETH LP",
          apy: "18.7%",
          risk: "high",
          tvl: "$3,456,789",
          rewards: ["PNG"],
          requirements: ["Provide HBAR-ETH liquidity"],
          strategy: "Stake LP tokens in Pangolin farm",
        },
        {
          name: "Staking HBAR",
          apy: "6.5%",
          risk: "low",
          tvl: "$10,000,000",
          rewards: ["HBAR"],
          requirements: ["Stake HBAR"],
          strategy: "Stake HBAR for network rewards",
        },
      ];

      const result = {
        strategies,
        totalStrategies: strategies.length,
        averageAPY: strategies.reduce((sum, strategy) => 
          sum + parseFloat(strategy.apy.replace("%", "")), 0
        ) / strategies.length,
        timestamp: new Date().toISOString(),
      };

      this.logger.info("Yield farming strategies retrieved", result);
      return result;
    } catch (error) {
      this.logger.error("Failed to get yield farming strategies", error);
      throw new Error(`Failed to get yield farming strategies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private async getSaucerSwapQuote(tokenIn: string, tokenOut: string, amount: string) {
    try {
      return await this.saucerSwapTools.getQuote(tokenIn, tokenOut, amount);
    } catch (error) {
      this.logger.warn("SaucerSwap quote failed", error);
      return null;
    }
  }

  private async getHeliSwapQuote(tokenIn: string, tokenOut: string, amount: string) {
    // Mock HeliSwap quote - in real implementation, you'd integrate with HeliSwap API
    return {
      dex: "HeliSwap",
      tokenIn: { address: tokenIn, amount },
      tokenOut: { 
        address: tokenOut, 
        expectedAmount: (parseFloat(amount) * 0.98).toFixed(6) // Mock rate
      },
      priceImpact: "0.1%",
    };
  }

  private async getPangolinQuote(tokenIn: string, tokenOut: string, amount: string) {
    // Mock Pangolin quote - in real implementation, you'd integrate with Pangolin API
    return {
      dex: "Pangolin",
      tokenIn: { address: tokenIn, amount },
      tokenOut: { 
        address: tokenOut, 
        expectedAmount: (parseFloat(amount) * 0.97).toFixed(6) // Mock rate
      },
      priceImpact: "0.2%",
    };
  }

  private async getQuoteFromDEX(dexName: string, tokenIn: string, tokenOut: string, amount: string) {
    switch (dexName) {
      case "SaucerSwap":
        return await this.getSaucerSwapQuote(tokenIn, tokenOut, amount);
      case "HeliSwap":
        return await this.getHeliSwapQuote(tokenIn, tokenOut, amount);
      case "Pangolin":
        return await this.getPangolinQuote(tokenIn, tokenOut, amount);
      default:
        throw new Error(`Unknown DEX: ${dexName}`);
    }
  }

  private async getCurrentPortfolio(walletAddress: string) {
    // Mock portfolio - in real implementation, you'd query wallet balances
    return {
      HBAR: { amount: "1000", value: "$500" },
      USDC: { amount: "2000", value: "$2000" },
      USDT: { amount: "1500", value: "$1500" },
      totalValue: "$4000",
    };
  }

  private async getYieldOpportunities(riskTolerance: string) {
    const strategies = await this.getYieldFarmingStrategies();
    
    return strategies.strategies.filter((strategy: any) => {
      switch (riskTolerance) {
        case "low":
          return strategy.risk === "low";
        case "medium":
          return strategy.risk === "low" || strategy.risk === "medium";
        case "high":
          return true;
        default:
          return strategy.risk === "medium";
      }
    });
  }

  private calculateOptimalAllocation(currentPortfolio: any, opportunities: any[], riskTolerance: string) {
    // Simplified allocation algorithm
    const totalValue = parseFloat(currentPortfolio.totalValue.replace("$", ""));
    
    const allocation = {
      staking: riskTolerance === "low" ? 0.6 : riskTolerance === "medium" ? 0.4 : 0.2,
      farming: riskTolerance === "low" ? 0.3 : riskTolerance === "medium" ? 0.5 : 0.7,
      liquidity: riskTolerance === "low" ? 0.1 : riskTolerance === "medium" ? 0.1 : 0.1,
    };

    return {
      HBAR: { allocation: allocation.staking * totalValue, strategy: "Staking" },
      "HBAR-USDC LP": { allocation: allocation.farming * totalValue * 0.5, strategy: "Farming" },
      "HBAR-USDT LP": { allocation: allocation.farming * totalValue * 0.5, strategy: "Farming" },
      "Liquidity Pools": { allocation: allocation.liquidity * totalValue, strategy: "Liquidity" },
    };
  }

  private calculateEstimatedAPY(allocation: any): string {
    // Simplified APY calculation
    const totalAllocation = Object.values(allocation).reduce((sum: number, item: any) => sum + item.allocation, 0);
    const weightedAPY = Object.values(allocation).reduce((sum: number, item: any) => {
      const apy = item.strategy === "Staking" ? 6.5 : item.strategy === "Farming" ? 15.0 : 8.0;
      return sum + (item.allocation / totalAllocation) * apy;
    }, 0);
    
    return `${weightedAPY.toFixed(2)}%`;
  }

  private generateRebalanceActions(currentPortfolio: any, optimalAllocation: any) {
    const actions = [];
    
    // Simplified rebalancing logic
    if (currentPortfolio.HBAR.amount < optimalAllocation.HBAR.allocation) {
      actions.push({
        action: "buy",
        token: "HBAR",
        amount: (optimalAllocation.HBAR.allocation - parseFloat(currentPortfolio.HBAR.amount)).toFixed(2),
        reason: "Increase staking allocation",
      });
    }

    return actions;
  }
} 