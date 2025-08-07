import dotenv from "dotenv";
import { z } from "zod";

// Environment schema validation
const EnvSchema = z.object({
  // Comput3 Configuration
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_API_URL: z.string().url("OPENAI_API_URL must be a valid URL"),
  SMALL_OPENAI_MODEL: z.string().default("llama3:70b"),
  MEDIUM_OPENAI_MODEL: z.string().default("llama3:70b"),
  LARGE_OPENAI_MODEL: z.string().default("llama3:70b"),

  // Hedera Configuration
  HEDERA_NETWORK: z.enum(["mainnet", "testnet"]).default("testnet"),
  HEDERA_OPERATOR_ID: z.string().regex(/^\d+\.\d+\.\d+$/, "Invalid Hedera account ID format"),
  HEDERA_OPERATOR_KEY: z.string().min(1, "HEDERA_OPERATOR_KEY is required"),

  // SaucerSwap Configuration
  SAUCERSWAP_API_URL: z.string().url("SAUCERSWAP_API_URL must be a valid URL"),
  SAUCERSWAP_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid router address"),

  // Server Configuration
  MCP_SERVER_PORT: z.string().transform(Number).pipe(z.number().positive()).default("3000"),
  MCP_SERVER_HOST: z.string().default("localhost"),

  // Security Configuration
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),

  // Logging Configuration
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Config = z.infer<typeof EnvSchema>;

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async load(): Promise<Config> {
    if (this.config) {
      return this.config;
    }

    // Load environment variables
    dotenv.config();

    try {
      this.config = EnvSchema.parse(process.env);
      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join('\n');
        throw new Error(`Configuration validation failed:\n${issues}`);
      }
      throw error;
    }
  }

  get(): Config {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call load() first.");
    }
    return this.config;
  }

  // Hedera network-specific configurations
  getHederaConfig() {
    const config = this.get();
    return {
      network: config.HEDERA_NETWORK,
      operatorId: config.HEDERA_OPERATOR_ID,
      operatorKey: config.HEDERA_OPERATOR_KEY,
      // Network-specific endpoints
      endpoints: config.HEDERA_NETWORK === "mainnet" 
        ? ["https://mainnet-public.mirrornode.hedera.com:443"]
        : ["https://testnet.mirrornode.hedera.com:443"],
    };
  }

  // SaucerSwap configuration
  getSaucerSwapConfig() {
    const config = this.get();
    return {
      apiUrl: config.SAUCERSWAP_API_URL,
      routerAddress: config.SAUCERSWAP_ROUTER_ADDRESS,
      network: config.HEDERA_NETWORK,
    };
  }

  // Comput3 configuration
  getComput3Config() {
    const config = this.get();
    return {
      apiKey: config.OPENAI_API_KEY,
      apiUrl: config.OPENAI_API_URL,
      models: {
        small: config.SMALL_OPENAI_MODEL,
        medium: config.MEDIUM_OPENAI_MODEL,
        large: config.LARGE_OPENAI_MODEL,
      },
    };
  }
}

export const Config = ConfigManager.getInstance(); 