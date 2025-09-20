const axios = require("axios");

// GraphQL endpoint (menggunakan USDC endpoint)
const GOLDSKY_API_URL =
  "https://api.goldsky.com/api/public/project_cltgsa3wr1zt001yu1nq7glpv/subgraphs/escrow-base-main/gn/graphql";

async function testGraphQLSchema() {
  try {
    console.log("🔍 Testing GraphQL Schema Introspection...");

    // 1. Get schema fields
    const schemaQuery = `
      query IntrospectSchema {
        __schema {
          queryType {
            fields {
              name
              description
            }
          }
        }
      }
    `;

    const schemaResponse = await axios.post(
      GOLDSKY_API_URL,
      {
        query: schemaQuery,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const fields = schemaResponse.data?.data?.__schema?.queryType?.fields || [];
    console.log("📊 Available GraphQL fields:");
    fields.forEach((field) => {
      console.log(
        `  - ${field.name}${field.description ? ` (${field.description})` : ""}`
      );
    });

    // 2. Filter withdraw-related fields
    const withdrawFields = fields.filter(
      (field) =>
        field.name.toLowerCase().includes("withdraw") ||
        field.name.toLowerCase().includes("token")
    );

    console.log("\n🪙 Withdraw/Token related fields:");
    withdrawFields.forEach((field) => {
      console.log(`  - ${field.name}`);
    });

    // 3. Try a simple query to find the right field name
    const testQueries = [
      "tokenWithdrawns",
      "tokenWithdraws",
      "withdrawFunds",
      "tokenWithdrawn",
      "withdrawTokens",
      "withdrawals",
    ];

    console.log("\n🧪 Testing different field names...");

    for (const fieldName of testQueries) {
      try {
        const testQuery = `
          query Test {
            ${fieldName}(first: 1) {
              id
            }
          }
        `;

        const testResponse = await axios.post(GOLDSKY_API_URL, {
          query: testQuery,
        });

        if (!testResponse.data.errors) {
          console.log(`✅ Field "${fieldName}" exists and works!`);
        } else {
          console.log(
            `❌ Field "${fieldName}" failed:`,
            testResponse.data.errors[0]?.message
          );
        }
      } catch (error) {
        console.log(
          `❌ Field "${fieldName}" error:`,
          error.response?.data?.errors?.[0]?.message || error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Schema introspection failed:", error.message);
  }
}

testGraphQLSchema();
