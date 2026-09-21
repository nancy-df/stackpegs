export type CategoryGroup = {
  id: string;
  label: string;
};

export type Category = {
  id: string;
  label: string;
  groupId: string;
  color: string;
};

export type Tool = {
  id: string;
  name: string;
  categoryId: string;
  iconSlug: string;
  website: string;
  description: string;
};

export const GROUPS: CategoryGroup[] = [
  { id: "data", label: "Data & Analytics" },
  { id: "sales", label: "Sales & Marketing" },
  { id: "work", label: "Work & Productivity" },
  { id: "ai", label: "AI & Automation" },
  { id: "ops", label: "Operations" },
];

export const CATEGORIES: Category[] = [
  { id: "bi", label: "BI Tools", groupId: "data", color: "#6366f1" },
  { id: "warehouse", label: "Data Warehouse", groupId: "data", color: "#0ea5e9" },
  { id: "etl", label: "ETL / Pipelines", groupId: "data", color: "#14b8a6" },
  { id: "analytics", label: "Analytics", groupId: "data", color: "#8b5cf6" },
  { id: "crm", label: "CRM", groupId: "sales", color: "#f97316" },
  { id: "marketing", label: "Marketing & Email", groupId: "sales", color: "#ec4899" },
  { id: "pm", label: "Project Management", groupId: "work", color: "#22c55e" },
  { id: "time", label: "Time Management", groupId: "work", color: "#eab308" },
  { id: "task", label: "Task Manager", groupId: "work", color: "#06b6d4" },
  { id: "comm", label: "Communication", groupId: "work", color: "#a855f7" },
  { id: "ai-tools", label: "AI Tools", groupId: "ai", color: "#d946ef" },
  { id: "automation", label: "Automation / iPaaS", groupId: "ai", color: "#ef4444" },
  { id: "support", label: "Customer Support", groupId: "ops", color: "#3b82f6" },
  { id: "finance", label: "Accounting & Finance", groupId: "ops", color: "#84cc16" },
];

const t = (
  id: string,
  name: string,
  categoryId: string,
  website: string,
  description: string,
  iconSlug = id,
): Tool => ({ id, name, categoryId, iconSlug, website, description });

export const TOOLS: Tool[] = [
  // BI
  t("tableau", "Tableau", "bi", "https://www.tableau.com", "Visual analytics and dashboarding platform."),
  t("powerbi", "Power BI", "bi", "https://powerbi.microsoft.com", "Microsoft's business analytics and reporting service."),
  t("looker", "Looker", "bi", "https://cloud.google.com/looker", "Google Cloud's governed BI platform built on a semantic model."),
  t("looker-studio", "Looker Studio", "bi", "https://lookerstudio.google.com", "Free Google dashboarding tool with many data connectors.", "looker"),
  t("qlik", "Qlik Sense", "bi", "https://www.qlik.com", "Associative-engine analytics and data integration."),
  t("metabase", "Metabase", "bi", "https://www.metabase.com", "Open-source BI with simple question-based querying."),
  t("domo", "Domo", "bi", "https://www.domo.com", "Cloud BI platform with built-in connectors and dashboards."),
  t("thoughtspot", "ThoughtSpot", "bi", "https://www.thoughtspot.com", "Search-driven analytics on top of cloud data warehouses."),
  t("superset", "Apache Superset", "bi", "https://superset.apache.org", "Open-source data exploration and visualization platform.", "apachesuperset"),
  t("sisense", "Sisense", "bi", "https://www.sisense.com", "Embeddable analytics for products and internal teams."),

  // Data warehouse / databases
  t("snowflake", "Snowflake", "warehouse", "https://www.snowflake.com", "Cloud data platform for warehousing and data sharing."),
  t("bigquery", "BigQuery", "warehouse", "https://cloud.google.com/bigquery", "Google Cloud's serverless data warehouse.", "googlebigquery"),
  t("redshift", "Amazon Redshift", "warehouse", "https://aws.amazon.com/redshift", "AWS's managed cloud data warehouse.", "amazonredshift"),
  t("databricks", "Databricks", "warehouse", "https://www.databricks.com", "Lakehouse platform for data engineering, analytics and ML."),
  t("postgresql", "PostgreSQL", "warehouse", "https://www.postgresql.org", "Open-source relational database."),
  t("mysql", "MySQL", "warehouse", "https://www.mysql.com", "Popular open-source relational database."),
  t("clickhouse", "ClickHouse", "warehouse", "https://clickhouse.com", "Column-oriented database for real-time analytics."),

  // ETL / pipelines
  t("fivetran", "Fivetran", "etl", "https://www.fivetran.com", "Managed connectors that sync SaaS and database data into warehouses."),
  t("airbyte", "Airbyte", "etl", "https://airbyte.com", "Open-source ELT with a large connector catalog."),
  t("stitch", "Stitch", "etl", "https://www.stitchdata.com", "Lightweight cloud ETL from Talend/Qlik."),
  t("segment", "Segment", "etl", "https://segment.com", "Customer data platform that collects events and routes them to tools."),
  t("dbt", "dbt", "etl", "https://www.getdbt.com", "SQL-based transformation layer that runs inside the warehouse."),
  t("matillion", "Matillion", "etl", "https://www.matillion.com", "Cloud-native ETL/ELT for warehouses like Snowflake and BigQuery."),

  // Analytics
  t("google-analytics", "Google Analytics", "analytics", "https://analytics.google.com", "Web and app traffic analytics.", "googleanalytics"),
  t("mixpanel", "Mixpanel", "analytics", "https://mixpanel.com", "Product analytics focused on user events and funnels."),
  t("amplitude", "Amplitude", "analytics", "https://amplitude.com", "Product analytics and behavioral cohorts."),
  t("hotjar", "Hotjar", "analytics", "https://www.hotjar.com", "Heatmaps, session recordings and on-site feedback."),
  t("heap", "Heap", "analytics", "https://www.heap.io", "Automatic event capture for product analytics."),
  t("posthog", "PostHog", "analytics", "https://posthog.com", "Open-source product analytics, replays and feature flags."),

  // CRM
  t("salesforce", "Salesforce", "crm", "https://www.salesforce.com", "Enterprise CRM platform."),
  t("hubspot", "HubSpot", "crm", "https://www.hubspot.com", "CRM with marketing, sales and service hubs."),
  t("zoho-crm", "Zoho CRM", "crm", "https://www.zoho.com/crm", "CRM in the wider Zoho app suite.", "zoho"),
  t("pipedrive", "Pipedrive", "crm", "https://www.pipedrive.com", "Pipeline-focused CRM for sales teams."),
  t("dynamics365", "Dynamics 365", "crm", "https://dynamics.microsoft.com", "Microsoft's CRM and ERP suite.", "dynamics365"),
  t("freshsales", "Freshsales", "crm", "https://www.freshworks.com/crm", "Freshworks' sales CRM.", "freshworks"),
  t("copper", "Copper", "crm", "https://www.copper.com", "CRM built around Google Workspace."),
  t("close", "Close", "crm", "https://close.com", "CRM with built-in calling and email for inside sales."),

  // Marketing
  t("mailchimp", "Mailchimp", "marketing", "https://mailchimp.com", "Email marketing and audience management."),
  t("activecampaign", "ActiveCampaign", "marketing", "https://www.activecampaign.com", "Email marketing automation with CRM features."),
  t("klaviyo", "Klaviyo", "marketing", "https://www.klaviyo.com", "Email/SMS marketing popular with e-commerce brands."),
  t("brevo", "Brevo", "marketing", "https://www.brevo.com", "Email, SMS and CRM (formerly Sendinblue)."),
  t("constantcontact", "Constant Contact", "marketing", "https://www.constantcontact.com", "Email marketing for small businesses."),
  t("kit", "Kit (ConvertKit)", "marketing", "https://kit.com", "Email marketing for creators.", "kit"),
  t("marketo", "Marketo", "marketing", "https://business.adobe.com/products/marketo", "Adobe's B2B marketing automation."),

  // Project management
  t("jira", "Jira", "pm", "https://www.atlassian.com/software/jira", "Issue and project tracking for software teams."),
  t("asana", "Asana", "pm", "https://asana.com", "Work management for teams and projects."),
  t("trello", "Trello", "pm", "https://trello.com", "Kanban boards for lightweight project tracking."),
  t("monday", "monday.com", "pm", "https://monday.com", "Configurable work OS for projects and workflows.", "mondaydotcom"),
  t("clickup", "ClickUp", "pm", "https://clickup.com", "All-in-one tasks, docs and project management."),
  t("basecamp", "Basecamp", "pm", "https://basecamp.com", "Simple project management and team communication."),
  t("smartsheet", "Smartsheet", "pm", "https://www.smartsheet.com", "Spreadsheet-style project and work management."),
  t("wrike", "Wrike", "pm", "https://www.wrike.com", "Work management for larger teams."),
  t("linear", "Linear", "pm", "https://linear.app", "Fast issue tracking for product and engineering teams."),

  // Time management
  t("toggl", "Toggl Track", "time", "https://toggl.com/track", "Simple time tracking with reports.", "toggl"),
  t("clockify", "Clockify", "time", "https://clockify.me", "Free time tracker and timesheets."),
  t("rescuetime", "RescueTime", "time", "https://www.rescuetime.com", "Automatic time tracking and focus tools."),
  t("harvest", "Harvest", "time", "https://www.getharvest.com", "Time tracking with invoicing."),
  t("timecamp", "TimeCamp", "time", "https://www.timecamp.com", "Time tracking with project budgeting."),
  t("calendly", "Calendly", "time", "https://calendly.com", "Scheduling links and meeting booking."),

  // Task managers
  t("todoist", "Todoist", "task", "https://todoist.com", "Personal and team to-do lists."),
  t("microsoft-todo", "Microsoft To Do", "task", "https://todo.microsoft.com", "Microsoft's task list app.", "microsofttodo"),
  t("things", "Things", "task", "https://culturedcode.com/things", "Apple-platform personal task manager.", "things"),
  t("ticktick", "TickTick", "task", "https://ticktick.com", "To-do lists with calendar and habit tracking."),
  t("anydo", "Any.do", "task", "https://www.any.do", "Tasks, reminders and planner."),
  t("notion", "Notion", "task", "https://www.notion.so", "Docs, wikis and task databases in one workspace."),

  // Communication
  t("slack", "Slack", "comm", "https://slack.com", "Team chat with a large app ecosystem."),
  t("teams", "Microsoft Teams", "comm", "https://www.microsoft.com/microsoft-teams", "Chat, meetings and collaboration in Microsoft 365.", "microsoftteams"),
  t("zoom", "Zoom", "comm", "https://zoom.us", "Video meetings and team chat."),
  t("discord", "Discord", "comm", "https://discord.com", "Community chat and voice."),
  t("google-chat", "Google Chat", "comm", "https://chat.google.com", "Messaging in Google Workspace.", "googlechat"),
  t("webex", "Webex", "comm", "https://www.webex.com", "Cisco's meetings and messaging platform."),

  // AI tools
  t("chatgpt", "ChatGPT", "ai-tools", "https://chatgpt.com", "OpenAI's AI assistant, with connectors, plugins and an API.", "openai"),
  t("claude", "Claude", "ai-tools", "https://claude.ai", "Anthropic's AI assistant, with an API, connectors and MCP integrations."),
  t("gemini", "Gemini", "ai-tools", "https://gemini.google.com", "Google's AI assistant, built into Workspace and available through an API.", "googlegemini"),
  t("copilot", "Microsoft Copilot", "ai-tools", "https://copilot.microsoft.com", "Microsoft's AI assistant across Microsoft 365, Teams and Windows.", "microsoftcopilot"),
  t("perplexity", "Perplexity", "ai-tools", "https://www.perplexity.ai", "AI answer engine that searches the web and cites sources."),
  t("mistral", "Mistral AI", "ai-tools", "https://mistral.ai", "AI models and the Le Chat assistant, also available through an API.", "mistralai"),
  t("github-copilot", "GitHub Copilot", "ai-tools", "https://github.com/features/copilot", "AI coding assistant inside editors and on GitHub.", "githubcopilot"),
  t("cursor", "Cursor", "ai-tools", "https://cursor.com", "AI-powered code editor."),
  t("otter", "Otter.ai", "ai-tools", "https://otter.ai", "AI meeting notes, transcription and summaries.", "otterdotai"),
  t("fireflies", "Fireflies.ai", "ai-tools", "https://fireflies.ai", "AI meeting recorder and note taker that syncs to CRMs and project tools."),

  // Automation / iPaaS
  t("zapier", "Zapier", "automation", "https://zapier.com", "No-code automation connecting thousands of apps."),
  t("make", "Make", "automation", "https://www.make.com", "Visual automation builder (formerly Integromat)."),
  t("workato", "Workato", "automation", "https://www.workato.com", "Enterprise integration and automation platform."),
  t("n8n", "n8n", "automation", "https://n8n.io", "Open-source, self-hostable workflow automation."),
  t("power-automate", "Power Automate", "automation", "https://powerautomate.microsoft.com", "Microsoft's workflow automation.", "powerautomate"),
  t("ifttt", "IFTTT", "automation", "https://ifttt.com", "Simple trigger-action applets."),

  // Customer support
  t("zendesk", "Zendesk", "support", "https://www.zendesk.com", "Helpdesk and customer service suite."),
  t("intercom", "Intercom", "support", "https://www.intercom.com", "Messaging, support and in-app engagement."),
  t("freshdesk", "Freshdesk", "support", "https://freshdesk.com", "Freshworks' ticketing and helpdesk."),
  t("helpscout", "Help Scout", "support", "https://www.helpscout.com", "Shared inbox and help center."),
  t("gorgias", "Gorgias", "support", "https://www.gorgias.com", "Helpdesk built for e-commerce stores."),
  t("front", "Front", "support", "https://front.com", "Shared inbox for team email and messaging."),

  // Accounting & finance
  t("quickbooks", "QuickBooks", "finance", "https://quickbooks.intuit.com", "Small-business accounting from Intuit."),
  t("xero", "Xero", "finance", "https://www.xero.com", "Cloud accounting for small businesses."),
  t("freshbooks", "FreshBooks", "finance", "https://www.freshbooks.com", "Invoicing and accounting for freelancers."),
  t("stripe", "Stripe", "finance", "https://stripe.com", "Payments and billing infrastructure."),
  t("netsuite", "NetSuite", "finance", "https://www.netsuite.com", "Oracle's cloud ERP and financials."),
  t("sage", "Sage", "finance", "https://www.sage.com", "Accounting and ERP for SMBs."),
];

export const TOOLS_BY_ID: Record<string, Tool> = Object.fromEntries(
  TOOLS.map((tool) => [tool.id, tool]),
);

export const CATEGORIES_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const MAX_CANVAS_TOOLS = 12;
