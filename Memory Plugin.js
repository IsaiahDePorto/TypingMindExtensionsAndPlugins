{
  "id": "7ee66126-1b0b-4360-8ff4-5830371e7b7b",
  "uuid": "7ee66126-1b0b-4360-8ff4-5830371e7b7b",
  "emoji": "🧩",
  "title": "MemoryPlugin",
  "iconURL": "https://www.memoryplugin.com/icon-white-bg.png",
  "syncedAt": "2026-01-31T00:20:36.000Z",
  "createdAt": "2026-01-13T21:01:25.253Z",
  "deletedAt": null,
  "githubURL": "https://github.com/ArekHalpern/MemoryPlugin",
  "oauthConfig": null,
  "permissions": [],
  "userSettings": [
    {
      "name": "token",
      "type": "password",
      "label": "MemoryPlugin Auth Token",
      "required": true,
      "description": "Get your auth token from memoryplugin.com/dashboard. Required for all features."
    }
  ],
  "pluginFunctions": [
    {
      "id": "store_memory",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function store_memory({ text, bucketId }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const today = new Date();\n  let memoryText = text;\n  if (today.getFullYear() > 2023 && !text.match(/^\\d{4}-\\d{2}-\\d{2}/)) {\n    const dateStr = today.toISOString().split('T')[0];\n    memoryText = dateStr + '\\n\\n' + text;\n  }\n  \n  const body = { text: memoryText };\n  if (bucketId) body.bucketId = bucketId;\n  \n  const res = await fetch(MP_API + 'v2/memory?client=typingmind', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer ' + userSettings.token,\n      'Content-Type': 'application/json'\n    },\n    body: JSON.stringify(body)\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error storing memory: ' + (err.error || res.statusText);\n  }\n  \n  const data = await res.json();\n  return data.isDuplicate ? 'Duplicate memory (already exists)' : 'Memory stored successfully';\n}",
      "name": "store_memory",
      "openaiSpec": {
        "name": "store_memory",
        "parameters": {
          "type": "object",
          "required": [
            "text"
          ],
          "properties": {
            "text": {
              "type": "string",
              "description": "REQUIRED. The memory text to store. Be concise but include enough context to be useful later."
            },
            "bucketId": {
              "type": "number",
              "description": "Optional: bucket ID to organize this memory. Call list_buckets to see options."
            }
          }
        },
        "description": "Save information to the user's MemoryPlugin account for future recall. Also known as 'save memory', 'remember', or 'add memory'.\n\nWHEN TO USE - be proactive! Save:\n- User preferences (e.g., \"I like dark mode\", \"Call me Alex\")\n- Personal facts (e.g., gender identity, pronouns, dietary restrictions)\n- Decisions and rationale\n- Project details and context\n- Anything the user explicitly asks to remember\n- Anything that seems useful for future conversations\n\nFORMAT: Write concise, self-contained facts. Include context. Example: \"Prefers to be addressed with feminine terms like 'girl' - finds it affirming.\"\n\nBuckets are optional organizational folders. Use list_buckets to see available ones, or ask the user."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "search_memories",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function search_memories({ query, bucketId, limit }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const params = new URLSearchParams({\n    query: query,\n    count: String(20|| 20),\n    client: 'typingmind'\n  });\n  if (bucketId) params.set('bucketId', String(bucketId));\n  \n  const res = await fetch(MP_API + 'v2/memory?' + params, {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error searching memories: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "search_memories",
      "openaiSpec": {
        "name": "search_memories",
        "parameters": {
          "type": "object",
          "required": [
            "query"
          ],
          "properties": {
            "limit": {
              "type": "number",
              "description": "Number of results (default: 10, max: 20)"
            },
            "query": {
              "type": "string",
              "description": "REQUIRED. Search query to find relevant memories. Be specific."
            },
            "bucketId": {
              "type": "number",
              "description": "Optional: limit search to specific bucket"
            }
          }
        },
        "description": "Semantic search across the user's saved memories. Uses hybrid semantic + keyword search for best relevance.\n\nWHEN TO USE:\n- User asks a specific question about something they might have stored\n- Looking for specific topics across potentially many memories\n- Need ranked results by relevance rather than recency\n\nDIFFERENCE FROM get_memories_and_buckets:\n- search_memories: Returns memories ranked by semantic relevance to query (this tool)\n- get_memories_and_buckets: Returns recent memories + bucket list, optionally filtered\n\nRequires a search query. Use get_memories_and_buckets if you just want to load recent memories. Recommended to use multiple times with different queries."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "get_memories_and_buckets",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function get_memories_and_buckets({ bucketId, count, all, query }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const params = new URLSearchParams({ client: 'typingmind' });\n  if (bucketId) params.set('bucketId', String(bucketId));\n  if (count) params.set('count', String(20));\n  if (all) params.set('all', 'true');\n  if (query) params.set('query', query);\n  \n  const res = await fetch(MP_API + 'v2/memory?' + params, {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error retrieving memories: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "get_memories_and_buckets",
      "openaiSpec": {
        "name": "get_memories_and_buckets",
        "parameters": {
          "type": "object",
          "properties": {
            "all": {
              "type": "boolean",
              "description": "Set true to fetch ALL memories (use sparingly - can be large)"
            },
            "count": {
              "type": "number",
              "description": "Number of memories to retrieve (default: 10)"
            },
            "query": {
              "type": "string",
              "description": "Optional: search query to filter memories by relevance"
            },
            "bucketId": {
              "type": "number",
              "description": "Optional: filter to specific bucket ID"
            }
          }
        },
        "description": "Load the user's saved memories from MemoryPlugin. Also known as 'load memories', 'get memories', or 'fetch memories'.\n\nTHIS IS THE PRIMARY TOOL for retrieving what the user has stored. Use it when:\n- User asks \"What do you know about me?\"\n- User asks about their preferences, facts, or stored information\n- At conversation start to load context that might help\n- User mentions MemoryPlugin or their stored memories\n\nDIFFERENCE FROM OTHER TOOLS:\n- get_memories_and_buckets: Load stored factoids/memories (this tool)\n- recall_chat_history: Search past AI conversation transcripts\n- search_memories: Semantic search across memories\n\nCall with no parameters to get recent memories + bucket list. Add 'query' for filtered search."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "list_buckets",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function list_buckets(params, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'buckets', {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error listing buckets: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "list_buckets",
      "openaiSpec": {
        "name": "list_buckets",
        "parameters": {
          "type": "object",
          "properties": {}
        },
        "description": "List the user's memory buckets. Buckets are organizational folders for memories (e.g., 'Work', 'Personal', 'Health')."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "create_bucket",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function create_bucket({ name }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'buckets', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer ' + userSettings.token,\n      'Content-Type': 'application/json'\n    },\n    body: JSON.stringify({ name })\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error creating bucket: ' + (err.error || res.statusText);\n  }\n  \n  const data = await res.json();\n  return 'Bucket \"' + name + '\" created successfully (ID: ' + data.id + ')';\n}",
      "name": "create_bucket",
      "openaiSpec": {
        "name": "create_bucket",
        "parameters": {
          "type": "object",
          "required": [
            "name"
          ],
          "properties": {
            "name": {
              "type": "string",
              "description": "Name for the new bucket"
            }
          }
        },
        "description": "Create a new bucket to organize memories. Buckets are folders like 'Work', 'Personal', 'Health'. Ask the user for a name if not specified."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "list_bucket_categories",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function list_bucket_categories({ bucketId }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'buckets/' + bucketId + '/categories', {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error listing categories: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "list_bucket_categories",
      "openaiSpec": {
        "name": "list_bucket_categories",
        "parameters": {
          "type": "object",
          "required": [
            "bucketId"
          ],
          "properties": {
            "bucketId": {
              "type": "number",
              "description": "Bucket ID to get categories for"
            }
          }
        },
        "description": "List AI-generated categories within a bucket. When users activate Smart Memory, their memories are automatically organized into topic-based categories.\n\nReturns for each category:\n- name: Category title\n- summary: Dense overview of core facts, preferences, current projects, key context (~200 words)\n- additionalInfo: Lists specific topics available in this category\n- memoryCount: Number of memories in category\n\nAlso returns recentMemories: the 30 most recent memories in the bucket.\n\nUse the summary and additionalInfo to decide if/when to load full memories via list_category_memories.\n\nNote: This is a Premium feature."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "list_category_memories",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function list_category_memories({ bucketId, categoryId }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'buckets/' + bucketId + '/categories/' + categoryId + '/memories', {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error listing category memories: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "list_category_memories",
      "openaiSpec": {
        "name": "list_category_memories",
        "parameters": {
          "type": "object",
          "required": [
            "bucketId",
            "categoryId"
          ],
          "properties": {
            "bucketId": {
              "type": "number",
              "description": "Bucket ID containing the category"
            },
            "categoryId": {
              "type": "string",
              "description": "Category ID (encoded string from list_bucket_categories)"
            }
          }
        },
        "description": "Get all memories within a specific Smart Memory category. Use when a category's summary (from list_bucket_categories) indicates it's relevant to the current conversation. The categoryId persists across conversations.\n\nNote: This is a Premium feature."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "search_uploaded_files",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function search_uploaded_files({ query, bucketId, topK }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const params = new URLSearchParams({\n    query: query,\n    count: String(topK || 5)\n  });\n  if (bucketId) params.set('bucketId', String(bucketId));\n  \n  const res = await fetch(MP_API + 'v2/files/search?' + params, {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    return 'Error searching files: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "search_uploaded_files",
      "openaiSpec": {
        "name": "search_uploaded_files",
        "parameters": {
          "type": "object",
          "required": [
            "query"
          ],
          "properties": {
            "topK": {
              "type": "number",
              "description": "Number of results to return (default: 5, max: 20)"
            },
            "query": {
              "type": "string",
              "description": "Search query text"
            },
            "bucketId": {
              "type": "number",
              "description": "Optional file bucket ID to limit search scope"
            }
          }
        },
        "description": "Search documents the user has uploaded to their MemoryPlugin document library (not files uploaded directly to this conversation). MemoryPlugin file buckets store documents persistently across all AI chats.\n\nReturns relevant text passages with source file and page info.\n\nUse when:\n- User explicitly mentions their MemoryPlugin documents\n- User asks about \"my files\" or \"my documents\" and there are no files in the current conversation\n- If unsure whether they mean MemoryPlugin files or conversation files, ask to clarify\n\nNote: This is a Premium feature."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "recall_chat_history",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function recall_chat_history({ query, maxTokens, platform, queries }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  if (!query && (!queries || queries.length === 0)) {\n    return 'Error: Either query or queries parameter is required';\n  }\n  \n  const body = queries && queries.length > 0\n    ? { queries: queries }\n    : {\n        query: query,\n        maxTokens: maxTokens || 12000,\n        platform: platform || 'typingmind'\n      };\n  \n  const res = await fetch(MP_API + 'chat-history/inject', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer ' + userSettings.token,\n      'Content-Type': 'application/json'\n    },\n    body: JSON.stringify(body)\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    if (res.status === 403) {\n      return 'Chat History is a Premium feature. Upgrade at memoryplugin.com to search your past conversations.';\n    }\n    return 'Error recalling chat history: ' + (err.error || res.statusText);\n  }\n  \n  return await res.json();\n}",
      "name": "recall_chat_history",
      "openaiSpec": {
        "name": "recall_chat_history",
        "parameters": {
          "type": "object",
          "required": [
            "query"
          ],
          "properties": {
            "query": {
              "type": "string",
              "description": "REQUIRED. What to search for in past conversations. Be specific and include related terms (e.g., 'gender identity pronouns preferences' not just 'gender')."
            },
            "queries": {
              "type": "array",
              "items": {
                "type": "object",
                "required": [
                  "query"
                ],
                "properties": {
                  "query": {
                    "type": "string",
                    "description": "The search query"
                  },
                  "maxTokens": {
                    "type": "number",
                    "description": "Max tokens for this query (default: 600)"
                  }
                }
              },
              "description": "Optional: Array of parallel queries for complex topics (max 15). Use for multifaceted searches from different angles."
            },
            "platform": {
              "enum": [
                "claude",
                "chatgpt",
                "typingmind"
              ],
              "type": "string",
              "description": "Optional: filter to specific platform"
            },
            "maxTokens": {
              "type": "number",
              "description": "Max tokens for context (default: 600, max: 2000). More tokens = richer detail."
            }
          }
        },
        "description": "Search and synthesize context from the user's past AI conversations. Also known as 'inject tool', 'chat history tool', or 'memory inject'. MemoryPlugin's Chat History feature syncs conversations from ChatGPT, Claude, TypingMind, and other platforms.\n\nWHEN TO USE:\n- User asks about past decisions, patterns, preferences, or personal history (e.g., \"What do you know about my gender?\", \"What have we discussed before?\")\n- User references previous conversations (e.g., \"Remember when I told you...\")\n- User asks for context that would be in their conversation history\n- Proactively suggest when the user's question could benefit from their history\n\nIMPORTANT: You MUST provide a 'query' parameter. The query should describe what to search for.\n\nEXAMPLES:\n- \"What do you know about my gender?\" → query: \"gender identity pronouns preferences\"\n- \"What projects am I working on?\" → query: \"current projects work side projects\"\n- \"What are my food preferences?\" → query: \"food preferences diet allergies likes dislikes\"\n\nReturns synthesized summaries with source metadata. Premium feature."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "get_conversation_summary",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function get_conversation_summary({ conversationId }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'chat-history/summaries/get-or-generate', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer ' + userSettings.token,\n      'Content-Type': 'application/json'\n    },\n    body: JSON.stringify({ conversationId })\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    if (res.status === 403) {\n      return 'Conversation summaries are a Premium feature. Upgrade at memoryplugin.com';\n    }\n    if (res.status === 404) {\n      return 'Conversation not found';\n    }\n    return 'Error getting conversation summary: ' + (err.message || err.error || res.statusText);\n  }\n  \n  const data = await res.json();\n  \n  if (data.status === 'pending' || data.status === 'processing') {\n    return 'Summary is being generated. Please try again in a moment.';\n  }\n  \n  if (data.status === 'failed') {\n    return 'Summary generation failed: ' + (data.errorMessage || 'Unknown error');\n  }\n  \n  return data.summary || data;\n}",
      "name": "get_conversation_summary",
      "openaiSpec": {
        "name": "get_conversation_summary",
        "parameters": {
          "type": "object",
          "required": [
            "conversationId"
          ],
          "properties": {
            "conversationId": {
              "type": "string",
              "description": "Conversation ID from the recall_chat_history sources array"
            }
          }
        },
        "description": "Get details of a specific past conversation. For short conversations (<5K tokens), returns the full transcript. For longer conversations, returns an AI-generated summary.\n\nUse when the user wants to dive deeper into a conversation returned by recall_chat_history. Requires the conversationId from that tool's sources array.\n\nNote: This is a Premium feature."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    },
    {
      "id": "get_full_conversation",
      "code": "const MP_API = 'https://www.memoryplugin.com/api/';\n\nasync function get_full_conversation({ conversationId }, userSettings) {\n  if (!userSettings.token) {\n    return 'ERROR: Please set your MemoryPlugin auth token in the plugin settings. Get your token from https://www.memoryplugin.com/dashboard';\n  }\n  \n  const res = await fetch(MP_API + 'chat-history/conversation?conversationId=' + encodeURIComponent(conversationId), {\n    headers: { 'Authorization': 'Bearer ' + userSettings.token }\n  });\n  \n  if (!res.ok) {\n    const err = await res.json().catch(() => ({}));\n    if (res.status === 403) {\n      return 'Chat History is a Premium feature. Upgrade at memoryplugin.com';\n    }\n    if (res.status === 404) {\n      return 'Conversation not found';\n    }\n    return 'Error getting conversation: ' + (err.error || res.statusText);\n  }\n  \n  const data = await res.json();\n  \n  if (!data.messages || data.messages.length === 0) {\n    return 'Conversation is empty or excluded';\n  }\n  \n  const header = '# ' + (data.title || 'Untitled Conversation') + '\\n\\n*' + data.total + ' messages, ' + (data.tokenCount || 0).toLocaleString() + ' tokens*\\n\\n---\\n\\n';\n  \n  const formatted = data.messages.map(function(m) {\n    const role = m.sender === 'user' ? 'User' : 'Assistant';\n    return '**' + role + ':** ' + m.text;\n  }).join('\\n\\n');\n  \n  return header + formatted;\n}",
      "name": "get_full_conversation",
      "openaiSpec": {
        "name": "get_full_conversation",
        "parameters": {
          "type": "object",
          "required": [
            "conversationId"
          ],
          "properties": {
            "conversationId": {
              "type": "string",
              "description": "Conversation ID from the recall_chat_history sources array"
            }
          }
        },
        "description": "Get the complete transcript of a specific past conversation. Returns all messages in the conversation without summarization.\n\nUse when you need the raw conversation content. Requires the conversationId from recall_chat_history's sources array.\n\nNote: This is a Premium feature. May return large amounts of data for long conversations."
      },
      "outputType": "respond_to_ai",
      "implementationType": "javascript"
    }
  ],
  "overviewMarkdown": "## MemoryPlugin\n\nMemoryPlugin gives AI assistants persistent memory across conversations. Store preferences, decisions, project details, and personal information that persists between chat sessions.\n\n### Features\n\n- **Memories**: Store and search information across conversations\n- **Buckets**: Organize memories into folders (Work, Personal, Health, etc.)\n- **Smart Memory** (Premium): AI-organized categories within buckets\n- **File Search** (Premium): Search your uploaded documents\n- **Chat History** (Premium): Search and recall past AI conversations\n\n### Setup\n\n1. Get your auth token from [memoryplugin.com/dashboard](https://www.memoryplugin.com/dashboard)\n2. Click the Settings tab and enter your token\n\n### Example Usage\n\n> Remember that I prefer dark mode and use VS Code for development\n\n> What do you know about my work projects?\n\n> Search my past conversations about the API migration\n",
  "authenticationType": "AUTH_TYPE_NONE",
  "dynamicContextEndpoints": [],
  "sharedOAuthConnectionID": null
}
