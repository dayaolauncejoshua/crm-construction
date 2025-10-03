import { Client } from "@notionhq/client";
import { notion, NOTION_PAGE_ID, createDatabaseIfNotExists, findDatabaseByTitle } from "./notion";

// Environment variables validation
if (!process.env.NOTION_INTEGRATION_SECRET) {
    throw new Error("NOTION_INTEGRATION_SECRET is not defined. Please add it to your environment variables.");
}

// Setup comprehensive SOP and reporting databases for the AI lead generation system
async function setupNotionDatabases() {
    console.log("Setting up Notion databases for AI Lead Generation System...");

    // Create SOPs database
    await createDatabaseIfNotExists("SOPs", {
        Title: {
            title: {}
        },
        Category: {
            select: {
                options: [
                    { name: "Onboarding", color: "blue" },
                    { name: "Lead Qualification", color: "green" },
                    { name: "WhatsApp Setup", color: "orange" },
                    { name: "VSL Generation", color: "purple" },
                    { name: "Analytics", color: "red" },
                    { name: "Troubleshooting", color: "gray" },
                    { name: "Advanced Features", color: "pink" }
                ]
            }
        },
        Type: {
            select: {
                options: [
                    { name: "Step-by-step", color: "blue" },
                    { name: "Video Tutorial", color: "green" },
                    { name: "Best Practices", color: "orange" },
                    { name: "Troubleshooting", color: "red" }
                ]
            }
        },
        Priority: {
            select: {
                options: [
                    { name: "Critical", color: "red" },
                    { name: "High", color: "orange" },
                    { name: "Medium", color: "yellow" },
                    { name: "Low", color: "gray" }
                ]
            }
        },
        LastUpdated: {
            date: {}
        },
        VideoURL: {
            url: {}
        },
        Tags: {
            multi_select: {
                options: [
                    { name: "client-setup", color: "blue" },
                    { name: "lead-management", color: "green" },
                    { name: "automation", color: "purple" },
                    { name: "reporting", color: "orange" },
                    { name: "white-label", color: "pink" }
                ]
            }
        }
    });

    // Create Executive Reports database
    await createDatabaseIfNotExists("Executive Reports", {
        Title: {
            title: {}
        },
        Client: {
            select: {
                options: [
                    { name: "Demo Client", color: "blue" },
                    { name: "TechStartup Inc", color: "green" },
                    { name: "Local Services", color: "orange" }
                ]
            }
        },
        Period: {
            select: {
            options: [
                    { name: "Weekly", color: "blue" },
                    { name: "Monthly", color: "green" },
                    { name: "Quarterly", color: "purple" }
                ]
            }
        },
        Status: {
            select: {
                options: [
                    { name: "Draft", color: "gray" },
                    { name: "Generated", color: "yellow" },
                    { name: "Sent", color: "green" },
                    { name: "Reviewed", color: "blue" }
                ]
            }
        },
        GeneratedDate: {
            date: {}
        },
        LeadCount: {
            number: {}
        },
        ConversionRate: {
            number: {
                format: "percent"
            }
        },
        ResponseTime: {
            number: {}
        },
        RevenueGenerated: {
            number: {
                format: "dollar"
            }
        },
        LoomVideoURL: {
            url: {}
        },
        PDFReportURL: {
            url: {}
        },
        KeyFindings: {
            rich_text: {}
        }
    });

    // Create Client Feedback database
    await createDatabaseIfNotExists("Client Feedback", {
        Title: {
            title: {}
        },
        Client: {
            select: {
                options: [
                    { name: "Demo Client", color: "blue" },
                    { name: "TechStartup Inc", color: "green" },
                    { name: "Local Services", color: "orange" }
                ]
            }
        },
        FeedbackType: {
            select: {
                options: [
                    { name: "Feature Request", color: "blue" },
                    { name: "Bug Report", color: "red" },
                    { name: "General Feedback", color: "green" },
                    { name: "Complaint", color: "orange" }
                ]
            }
        },
        Priority: {
            select: {
                options: [
                    { name: "Critical", color: "red" },
                    { name: "High", color: "orange" },
                    { name: "Medium", color: "yellow" },
                    { name: "Low", color: "gray" }
                ]
            }
        },
        Status: {
            select: {
                options: [
                    { name: "New", color: "red" },
                    { name: "In Progress", color: "yellow" },
                    { name: "Resolved", color: "green" },
                    { name: "Closed", color: "gray" }
                ]
            }
        },
        SubmittedDate: {
            date: {}
        },
        Description: {
            rich_text: {}
        },
        Resolution: {
            rich_text: {}
        }
    });

    console.log("✅ All Notion databases created successfully!");
}

async function createSampleSOPs() {
    try {
        console.log("Creating sample SOPs...");

        const sopsDb = await findDatabaseByTitle("SOPs");
        if (!sopsDb) {
            throw new Error("SOPs database not found.");
        }

        const sampleSOPs = [
            {
                title: "Client Onboarding Process",
                category: "Onboarding",
                type: "Step-by-step",
                priority: "Critical",
                content: `# Client Onboarding Process

## Step 1: Initial Setup
1. Create client profile in the system
2. Configure WhatsApp Business API connection
3. Set up lead capture forms
4. Configure audit templates

## Step 2: Customization
1. White-label dashboard setup
2. Custom domain configuration
3. Branding asset upload
4. Notification preferences

## Step 3: Training
1. Schedule training session
2. Provide access credentials
3. Share documentation
4. Set up support channels

## Step 4: Testing
1. Test lead capture flow
2. Verify WhatsApp integration
3. Check reporting accuracy
4. Validate automation triggers`,
                tags: ["client-setup", "onboarding"],
                videoUrl: "https://example.com/onboarding-video"
            },
            {
                title: "Lead Qualification Best Practices",
                category: "Lead Qualification",
                type: "Best Practices",
                priority: "High",
                content: `# Lead Qualification Best Practices

## Qualification Criteria
- Budget confirmation
- Decision-making authority
- Timeline validation
- Pain point identification

## AI Scoring Guidelines
- Response time < 2 minutes: +10 points
- Budget mentioned: +15 points
- Immediate need: +20 points
- Contact information provided: +5 points

## Follow-up Strategies
- First response: Within 2 minutes
- Second follow-up: 1 hour if no response
- Third follow-up: 24 hours
- Final follow-up: 1 week

## Red Flags
- Generic responses
- No contact information
- Unrealistic budget expectations
- Immediate pressure for meetings`,
                tags: ["lead-management", "qualification"],
                videoUrl: "https://example.com/qualification-video"
            },
            {
                title: "WhatsApp Integration Setup",
                category: "WhatsApp Setup",
                type: "Step-by-step",
                priority: "Critical",
                content: `# WhatsApp Business API Setup

## Prerequisites
- WhatsApp Business account
- Facebook Business Manager access
- Phone number verification
- SSL certificate

## Configuration Steps
1. Create WhatsApp Business API account
2. Verify business phone number
3. Generate access tokens
4. Configure webhook endpoints
5. Set up message templates
6. Test integration

## Message Templates
Create templates for:
- Welcome messages
- Qualification questions
- Follow-up sequences
- Appointment confirmations
- Support responses

## Webhook Configuration
- Endpoint: /api/webhooks/whatsapp
- Verification token: [SECURE_TOKEN]
- Message types: text, media, interactive`,
                tags: ["whatsapp", "automation", "setup"],
                videoUrl: "https://example.com/whatsapp-setup"
            },
            {
                title: "Executive Reporting Generation",
                category: "Analytics",
                type: "Step-by-step",
                priority: "High",
                content: `# Executive Report Generation

## Automated Report Components
1. Lead generation metrics
2. Conversion rate analysis
3. Response time tracking
4. ROI calculations
5. Trend analysis

## Report Schedule
- Weekly reports: Every Monday
- Monthly reports: 1st of each month
- Quarterly reports: Start of quarter
- Annual reports: January 1st

## Distribution
- Email delivery to stakeholders
- Notion page creation
- PDF report generation
- Loom video summary

## Key Metrics
- Total leads generated
- Cost per lead
- Conversion rate
- Average response time
- Revenue attributed`,
                tags: ["reporting", "analytics", "automation"],
                videoUrl: "https://example.com/reporting-video"
            }
        ];

        for (let sop of sampleSOPs) {
            await notion.pages.create({
                parent: {
                    database_id: sopsDb.id
                },
                properties: {
                    Title: {
                        title: [
                            {
                                text: {
                                    content: sop.title
                                }
                            }
                        ]
                    },
                    Category: {
                        select: {
                            name: sop.category
                        }
                    },
                    Type: {
                        select: {
                            name: sop.type
                        }
                    },
                    Priority: {
                        select: {
                            name: sop.priority
                        }
                    },
                    LastUpdated: {
                        date: {
                            start: new Date().toISOString().split('T')[0]
                        }
                    },
                    VideoURL: {
                        url: sop.videoUrl
                    },
                    Tags: {
                        multi_select: sop.tags.map(tag => ({ name: tag }))
                    }
                },
                children: [
                    {
                        object: "block",
                        type: "paragraph",
                        paragraph: {
                            rich_text: [
                                {
                                    type: "text",
                                    text: {
                                        content: sop.content
                                    }
                                }
                            ]
                        }
                    }
                ]
            });

            console.log(`✅ Created SOP: ${sop.title}`);
        }

        console.log("✅ Sample SOPs creation complete!");
    } catch (error) {
        console.error("Error creating sample SOPs:", error);
    }
}

async function createSampleExecutiveReport() {
    try {
        console.log("Creating sample executive report...");

        const reportsDb = await findDatabaseByTitle("Executive Reports");
        if (!reportsDb) {
            throw new Error("Executive Reports database not found.");
        }

        const reportContent = `# Weekly Executive Report - Demo Client
## Period: January 15-21, 2024

### Executive Summary
This week showed strong performance across all key metrics with a 23% increase in lead generation and improved response times averaging 1.4 minutes.

### Key Performance Indicators
- **Total Leads Generated**: 156 (+23% from last week)
- **Conversion Rate**: 18.5% (+2.1% improvement)
- **Average Response Time**: 1.4 minutes (target: <2 minutes)
- **Revenue Generated**: $45,800 (+31% from last week)

### Notable Achievements
1. Implemented new AI qualification algorithm
2. Reduced response time by 35%
3. Increased conversion rate through better lead scoring
4. Launched white-label portal for client

### Areas for Improvement
- Follow-up automation needs refinement
- SERP monitoring coverage expansion
- Brand mention tracking optimization

### Next Week's Focus
- Launch competitor tracking dashboard
- Implement advanced lead scoring model
- Expand WhatsApp automation features
- Begin quarterly planning session`;

        await notion.pages.create({
            parent: {
                database_id: reportsDb.id
            },
            properties: {
                Title: {
                    title: [
                        {
                            text: {
                                content: "Weekly Report - Demo Client - Jan 15-21, 2024"
                            }
                        }
                    ]
                },
                Client: {
                    select: {
                        name: "Demo Client"
                    }
                },
                Period: {
                    select: {
                        name: "Weekly"
                    }
                },
                Status: {
                    select: {
                        name: "Generated"
                    }
                },
                GeneratedDate: {
                    date: {
                        start: new Date().toISOString().split('T')[0]
                    }
                },
                LeadCount: {
                    number: 156
                },
                ConversionRate: {
                    number: 0.185
                },
                ResponseTime: {
                    number: 1.4
                },
                RevenueGenerated: {
                    number: 45800
                },
                LoomVideoURL: {
                    url: "https://example.com/executive-summary-video"
                },
                PDFReportURL: {
                    url: "https://example.com/weekly-report.pdf"
                },
                KeyFindings: {
                    rich_text: [
                        {
                            text: {
                                content: "Strong week with 23% lead increase and 2.1% conversion improvement. AI qualification algorithm performing well."
                            }
                        }
                    ]
                }
            },
            children: [
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: reportContent
                                }
                            }
                        ]
                    }
                }
            ]
        });

        console.log("✅ Sample executive report created!");
    } catch (error) {
        console.error("Error creating sample executive report:", error);
    }
}

// Run the setup
setupNotionDatabases()
    .then(() => createSampleSOPs())
    .then(() => createSampleExecutiveReport())
    .then(() => {
        console.log("🎉 Notion setup complete! Your AI Lead Generation System is ready.");
        process.exit(0);
    })
    .catch(error => {
        console.error("❌ Setup failed:", error);
        process.exit(1);
    });