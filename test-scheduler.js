import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Test database connection and table structure
async function testDatabase() {
  console.log("Testing database connection...");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // Check if reminders table exists
    console.log("Checking reminders table structure...");
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .limit(1);

    if (error) {
      console.error("Error accessing reminders table:", error);
      return;
    }

    console.log("Reminders table exists. Sample data:", data);

    // Check table structure by trying a simple query
    console.log("Checking for is_active column...");
    const { data: activeData, error: activeError } = await supabase
      .from("reminders")
      .select("id, is_active")
      .limit(1);

    if (activeError) {
      console.error("is_active column error:", activeError);
      console.log("Column doesn't exist. Checking actual table structure...");

      // Get table structure using information_schema
      const { data: columns, error: structError } = await supabase.rpc(
        "get_table_columns",
        { table_name: "reminders" },
      );

      if (structError) {
        console.log(
          "Could not get table structure via RPC. Trying direct query...",
        );

        // Try to get column info directly
        const { data: infoData, error: infoError } = await supabase
          .from("information_schema.columns")
          .select("column_name, data_type, is_nullable, column_default")
          .eq("table_name", "reminders")
          .eq("table_schema", "public");

        if (infoError) {
          console.error("Could not get column info:", infoError);
        } else {
          console.log("Current reminders table columns:");
          infoData.forEach((col) => {
            console.log(
              `- ${col.column_name}: ${col.data_type} ${col.is_nullable === "YES" ? "NULL" : "NOT NULL"} ${col.column_default ? `DEFAULT ${col.column_default}` : ""}`,
            );
          });
        }
      } else {
        console.log("Table structure:", columns);
      }
    } else {
      console.log("is_active column exists:", activeData);
    }
    // Check slack_connections table
    console.log("Checking slack_connections table...");
    const { data: connData, error: connError } = await supabase
      .from("slack_connections")
      .select("*")
      .limit(1);

    if (connError) {
      console.error("slack_connections table error:", connError);
    } else {
      console.log("slack_connections table exists. Sample data:", connData);
      console.log(
        "Columns in slack_connections:",
        Object.keys(connData[0] || {}),
      );
    }
  } catch (error) {
    console.error("Database test failed:", error);
  }
}

testDatabase();
