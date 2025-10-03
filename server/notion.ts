import { Client } from "@notionhq/client";

// Initialize Notion client
export const notion = process.env.NOTION_INTEGRATION_SECRET ? new Client({
    auth: process.env.NOTION_INTEGRATION_SECRET,
}) : null;

// Extract the page ID from the Notion page URL
function extractPageIdFromUrl(pageUrl: string): string {
    const match = pageUrl.match(/([a-f0-9]{32})(?:[?#]|$)/i);
    if (match && match[1]) {
        return match[1];
    }

    throw Error("Failed to extract page ID");
}

export const NOTION_PAGE_ID = process.env.NOTION_PAGE_URL ? extractPageIdFromUrl(process.env.NOTION_PAGE_URL) : null;

/**
 * Lists all child databases contained within NOTION_PAGE_ID
 * @returns {Promise<Array<{id: string, title: string}>>} - Array of database objects with id and title
 */
export async function getNotionDatabases() {
    if (!notion || !NOTION_PAGE_ID) {
        throw new Error("Notion integration not configured");
    }

    // Array to store the child databases
    const childDatabases = [];

    try {
        // Query all child blocks in the specified page
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const response = await notion.blocks.children.list({
                block_id: NOTION_PAGE_ID,
                start_cursor: startCursor,
            });

            // Process the results
            for (const block of response.results) {
                // Check if the block is a child database
                if ("type" in block && block.type === "child_database") {
                    const databaseId = block.id;

                    // Retrieve the database title
                    try {
                        const databaseInfo = await notion.databases.retrieve({
                            database_id: databaseId,
                        });

                        // Add the database to our list
                        childDatabases.push(databaseInfo);
                    } catch (error) {
                        console.error(`Error retrieving database ${databaseId}:`, error);
                    }
                }
            }

            // Check if there are more results to fetch
            hasMore = response.has_more;
            startCursor = response.next_cursor || undefined;
        }

        return childDatabases;
    } catch (error) {
        console.error("Error listing child databases:", error);
        throw error;
    }
}

// Find get a Notion database with the matching title
export async function findDatabaseByTitle(title: string) {
    const databases = await getNotionDatabases();

    for (const db of databases) {
        if ("title" in db && db.title && Array.isArray(db.title) && db.title.length > 0) {
            const dbTitle = db.title[0]?.plain_text?.toLowerCase() || "";
            if (dbTitle === title.toLowerCase()) {
                return db;
            }
        }
    }

    return null;
}

// Create a new database if one with a matching title does not exist
export async function createDatabaseIfNotExists(title: string, properties: any) {
    if (!notion || !NOTION_PAGE_ID) {
        throw new Error("Notion integration not configured");
    }
    
    const existingDb = await findDatabaseByTitle(title);
    if (existingDb) {
        return existingDb;
    }
    return await notion.databases.create({
        parent: {
            type: "page_id",
            page_id: NOTION_PAGE_ID
        },
        title: [
            {
                type: "text",
                text: {
                    content: title
                }
            }
        ],
        properties
    });
}

/**
 * Create or update SOP pages in Notion
 */
export async function createSOPPage(title: string, content: string, category?: string) {
    try {
        const response = await notion.pages.create({
            parent: {
                type: "page_id",
                page_id: NOTION_PAGE_ID
            },
            properties: {
                title: {
                    title: [
                        {
                            text: {
                                content: title
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
                                    content: content
                                }
                            }
                        ]
                    }
                }
            ]
        });

        return response;
    } catch (error) {
        console.error("Error creating SOP page:", error);
        throw error;
    }
}

/**
 * Sync SOP content from Notion
 */
export async function syncSOPContent(pageId: string) {
    try {
        const page = await notion.pages.retrieve({ page_id: pageId });
        const blocks = await notion.blocks.children.list({ block_id: pageId });

        return {
            page,
            blocks: blocks.results
        };
    } catch (error) {
        console.error("Error syncing SOP content:", error);
        throw error;
    }
}

/**
 * Get all SOPs from Notion workspace
 */
export async function getAllSOPs() {
    try {
        const response = await notion.search({
            filter: {
                property: "object",
                value: "page"
            },
            sort: {
                direction: "descending",
                timestamp: "last_edited_time"
            }
        });

        return response.results.filter((page: any) => 
            page.parent?.type === "page_id" && 
            page.parent?.page_id === NOTION_PAGE_ID
        );
    } catch (error) {
        console.error("Error getting all SOPs:", error);
        throw error;
    }
}

/**
 * Create executive report page in Notion
 */
export async function createExecutiveReport(clientId: string, reportData: any) {
    try {
        const title = `Executive Report - ${reportData.period} - ${reportData.clientName}`;
        
        const response = await notion.pages.create({
            parent: {
                type: "page_id",
                page_id: NOTION_PAGE_ID
            },
            properties: {
                title: {
                    title: [
                        {
                            text: {
                                content: title
                            }
                        }
                    ]
                }
            },
            children: [
                {
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "Executive Summary"
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: `Report for ${reportData.period}`
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: "Key Performance Indicators"
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: `Total Leads: ${reportData.kpis?.totalLeads || 0}`
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: `Conversion Rate: ${reportData.kpis?.conversionRate || 0}%`
                                }
                            }
                        ]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [
                            {
                                type: "text",
                                text: {
                                    content: `Response Time: ${reportData.kpis?.responseTime || 0} minutes`
                                }
                            }
                        ]
                    }
                }
            ]
        });

        return response;
    } catch (error) {
        console.error("Error creating executive report:", error);
        throw error;
    }
}