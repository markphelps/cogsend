import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

/** Minimal unmounted JSON-only handler used to validate SDK compatibility with the Worker runtime. */
export const mcpRuntimeProbe = createMcpHandler(
	() => {
		const server = new McpServer({ name: 'cogsend-runtime-probe', version: '1.0.0' });
		server.registerTool(
			'probe',
			{ description: 'Runtime compatibility probe', inputSchema: z.object({}) },
			async () => ({ content: [{ type: 'text', text: 'ok' }] })
		);
		return server;
	},
	{ responseMode: 'json' }
);
