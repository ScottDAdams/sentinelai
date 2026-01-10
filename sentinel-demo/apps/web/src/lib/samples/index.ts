import { SUPPORT_TICKET } from "./support_ticket";
import { HR_PAYROLL_CSV } from "./hr_payroll_csv";
import { CRM_EXPORT_CSV } from "./crm_export_csv";
import { SLACK_DUMP } from "./slack_dump";
import { ENV_LEAK } from "./env_leak";
import { APP_LOGS } from "./app_logs";

export type DemoSample = {
  id: string;
  label: string;
  input_type: "chat" | "file" | "code";
  content: string;
};

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "support-ticket",
    label: "Support Ticket (Embedded PII)",
    input_type: "chat",
    content: SUPPORT_TICKET,
  },
  {
    id: "hr-payroll",
    label: "HR Payroll CSV",
    input_type: "file",
    content: HR_PAYROLL_CSV,
  },
  {
    id: "crm-export",
    label: "CRM Export CSV",
    input_type: "file",
    content: CRM_EXPORT_CSV,
  },
  {
    id: "slack-dump",
    label: "Slack Dump (Credential Leak)",
    input_type: "chat",
    content: SLACK_DUMP,
  },
  {
    id: "env-leak",
    label: ".env Configuration Leak",
    input_type: "code",
    content: ENV_LEAK,
  },
  {
    id: "app-logs",
    label: "Application Logs (JWT in Headers)",
    input_type: "code",
    content: APP_LOGS,
  },
];
