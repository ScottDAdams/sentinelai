export const M365_COPILOT = `{
  "platform": "Microsoft 365 Copilot",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "sarah.chen@contoso.com",
    "displayName": "Sarah Chen",
    "department": "Finance",
    "role": "Senior Financial Analyst"
  },
  "workload": "Microsoft Teams",
  "sensitivity_label": "Confidential - Internal",
  "action": {
    "type": "generate_summary",
    "context": {
      "conversation_id": "19:meeting_ABC123DEF456@thread.v2",
      "thread_id": "19:meeting_ABC123DEF456@thread.v2",
      "message_count": 47,
      "participants": [
        {
          "email": "john.doe@contoso.com",
          "displayName": "John Doe",
          "role": "Director of Finance"
        },
        {
          "email": "maria.rodriguez@contoso.com",
          "displayName": "Maria Rodriguez",
          "role": "CFO"
        },
        {
          "email": "sarah.chen@contoso.com",
          "displayName": "Sarah Chen",
          "role": "Senior Financial Analyst"
        }
      ],
      "topic": "Q4 Financial Review and Budget Planning",
      "duration_minutes": 45,
      "start_time": "2024-11-05T14:00:00Z"
    },
    "request": "Summarize the key decisions made in this meeting regarding the Q4 budget allocation and action items for each participant.",
    "timestamp": "2024-11-05T14:47:23Z"
  },
  "content_preview": "Meeting summary requested for confidential financial discussion involving budget allocations and strategic planning decisions.",
  "compliance_flags": [
    "financial_data",
    "budget_information",
    "executive_discussion"
  ]
}`;
