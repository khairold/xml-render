# @khairold/xml-render

A type-safe XML-like tag parser and renderer framework for React and React Native. Parse structured content from text streams and render with custom components.

## Features

- **Type-safe parsing** - Define tags with Zod schemas, get full TypeScript inference
- **Streaming support** - Parse content progressively as it streams in
- **Platform agnostic** - Separate entry points for React and React Native
- **Error boundaries** - Individual segment errors don't crash the entire UI
- **Immutable by design** - All registry and catalog instances are frozen

## Installation

```bash
npm install @khairold/xml-render zod
# or
bun add @khairold/xml-render zod
```

Peer dependencies:
- `zod` ^3.0.0 (for attribute schemas)
- `react` ^18.0.0
- `react-native` (optional, for React Native renderer)

## Quick Start

```tsx
import { z } from 'zod';
import { createRegistry, createParser } from '@khairold/xml-render';
import { createCatalog, XmlRender } from '@khairold/xml-render/react';

// 1. Define your tags with Zod schemas
const registry = createRegistry({
  callout: {
    schema: z.object({ type: z.enum(['info', 'warning', 'error']) }),
    hasContent: true,
  },
  image: {
    schema: z.object({ src: z.string(), alt: z.string().optional() }),
    selfClosing: true,
  },
});

// 2. Create a parser
const parser = createParser(registry);

// 3. Create a component catalog
const catalog = createCatalog(registry, {
  components: {
    callout: ({ segment }) => (
      <div className={`callout callout-${segment.attributes?.type}`}>
        {segment.content}
      </div>
    ),
    image: ({ segment }) => (
      <img src={segment.attributes?.src} alt={segment.attributes?.alt} />
    ),
  },
  textRenderer: ({ segment }) => <span>{segment.content}</span>,
});

// 4. Parse and render
const text = 'Hello <callout type="info">Important message!</callout> World';
const segments = parser.parse(text);

function App() {
  return <XmlRender segments={segments} catalog={catalog} />;
}
```

## API Reference

### Core Functions

#### `createRegistry(definitions)`

Creates an immutable tag registry from tag definitions.

```ts
import { z } from 'zod';
import { createRegistry } from '@khairold/xml-render';

const registry = createRegistry({
  chart: {
    schema: z.object({
      type: z.enum(['bar', 'line', 'pie']),
      title: z.string().optional(),
    }),
    hasContent: true,      // Tag contains inner content (default: true)
    selfClosing: false,    // Tag must have closing tag (default: false)
  },
  image: {
    schema: z.object({
      src: z.string(),
      alt: z.string().optional(),
    }),
    selfClosing: true,     // Self-closing tag like <image />
    hasContent: false,
  },
});
```

**Registry methods:**
- `registry.tagNames` - Array of all registered tag names
- `registry.hasTag(name)` - Check if a tag is registered
- `registry.getTag(name)` - Get the definition for a tag
- `registry.validateAttributes(name, attrs)` - Validate attributes with Zod schema
- `registry.isSelfClosing(name)` - Check if tag is self-closing
- `registry.hasContent(name)` - Check if tag has content

#### `createParser(registry)`

Creates a parser instance bound to a registry.

```ts
import { createParser } from '@khairold/xml-render';

const parser = createParser(registry);

// Parse complete text
const segments = parser.parse('Hello <callout type="info">World</callout>');
// [
//   { type: 'text', content: 'Hello ' },
//   { type: 'callout', content: 'World', attributes: { type: 'info' } },
// ]
```

**Parser methods:**
- `parser.parse(text)` - Parse complete text into segments
- `parser.createState()` - Create initial state for streaming
- `parser.parseChunk(chunk, state)` - Parse streaming chunk
- `parser.finalize(state)` - Flush remaining buffer at stream end

### Streaming Usage

For real-time content streaming (e.g., LLM responses):

```ts
import { createParser, type ParserState } from '@khairold/xml-render';

const parser = createParser(registry);

// Initialize streaming state
let state = parser.createState();
let allSegments: Segments<typeof registry.definitions> = [];

// Process each chunk as it arrives
function onChunk(chunk: string) {
  const result = parser.parseChunk(chunk, state);

  // Update state for next chunk (immutable pattern)
  state = result.state;

  // Append complete segments
  allSegments = [...allSegments, ...result.segments];

  // Check if currently buffering a tag
  if (result.isBuffering && result.bufferingTag) {
    // Show loading placeholder for the buffering tag type
    showPlaceholder(result.bufferingTag);
  }
}

// When stream ends, finalize to flush any remaining content
function onStreamEnd() {
  const finalSegments = parser.finalize(state);
  allSegments = [...allSegments, ...finalSegments];
}
```

### React Renderer

```tsx
import { createCatalog, XmlRender, XmlRenderProvider } from '@khairold/xml-render/react';
```

#### `createCatalog(registry, options)`

Creates a component catalog mapping tag types to renderers.

```tsx
const catalog = createCatalog(registry, {
  components: {
    // Each component receives { segment, index } props
    callout: ({ segment }) => (
      <div className={`callout-${segment.attributes?.type}`}>
        {segment.content}
      </div>
    ),
    chart: ({ segment }) => (
      <ChartComponent
        type={segment.attributes?.type}
        title={segment.attributes?.title}
        data={JSON.parse(segment.content)}
      />
    ),
  },
  // Optional: custom text renderer (default: <span>{content}</span>)
  textRenderer: ({ segment }) => <MarkdownText>{segment.content}</MarkdownText>,
});
```

#### `<XmlRender>` Component

Renders an array of segments using the catalog.

```tsx
// Option 1: Pass catalog directly
<XmlRender segments={segments} catalog={catalog} />

// Option 2: Use context provider
<XmlRenderProvider catalog={catalog}>
  <XmlRender segments={segments} />
</XmlRenderProvider>

// With custom fallback for unknown segment types
<XmlRender
  segments={segments}
  catalog={catalog}
  fallback={(segment, index) => (
    <div>Unknown: {segment.type}</div>
  )}
/>

// With custom error fallback
<XmlRender
  segments={segments}
  catalog={catalog}
  errorFallback={(error, segmentType) => (
    <div>Error rendering {segmentType}: {error.message}</div>
  )}
/>
```

### React Native Renderer

```tsx
import { createCatalog, XmlRender, XmlRenderProvider } from '@khairold/xml-render/react-native';
```

The React Native API is identical to React. The only differences are:
- Default text renderer uses `<Text>` instead of `<span>`
- Container uses `<View>` instead of `<div>`
- Error boundary styles use React Native `StyleSheet`

### Type Utilities

```ts
import {
  type ParsedSegment,
  type Segments,
  type SegmentType,
  type ParserState,
  type InferAttributes,
  isSegmentType,
} from '@khairold/xml-render';

// Get attribute type for a specific tag
type ChartAttrs = InferAttributes<typeof registry.definitions.chart>;
// { type: 'bar' | 'line' | 'pie'; title?: string }

// Type-safe segment type checking
const segment: ParsedSegment<typeof registry.definitions> = /* ... */;
if (isSegmentType(segment, 'chart', registry)) {
  // segment.attributes is typed as ChartAttrs
  console.log(segment.attributes.type);
}
```

## Example: Tag Definitions

### Callout (notification box)

```ts
const calloutDef = {
  callout: {
    schema: z.object({
      type: z.enum(['info', 'warning', 'error']).default('info'),
    }),
    hasContent: true,
  },
};
// Usage: <callout type="warning">Watch out!</callout>
```

### Table (markdown table)

```ts
const tableDef = {
  table: {
    schema: z.object({}),
    hasContent: true,
  },
};
// Usage: <table>| Col1 | Col2 |\n|---|---|\n| A | B |</table>
```

### Chart (data visualization)

```ts
const chartDef = {
  chart: {
    schema: z.object({
      type: z.enum(['bar', 'line', 'pie']).default('bar'),
      title: z.string().optional(),
    }),
    hasContent: true,
  },
};
// Usage: <chart type="pie" title="Sales">{"labels":["Q1","Q2"],"data":[100,200]}</chart>
```

### Image (self-closing)

```ts
const imageDef = {
  image: {
    schema: z.object({
      src: z.string(),
      alt: z.string().optional(),
    }),
    selfClosing: true,
    hasContent: false,
  },
};
// Usage: <image src="photo.jpg" alt="A photo" />
```

## Platform-Specific Imports

```ts
// Core (parser + registry) - platform agnostic
import { createRegistry, createParser } from '@khairold/xml-render';

// React (web)
import { createCatalog, XmlRender } from '@khairold/xml-render/react';

// React Native (mobile)
import { createCatalog, XmlRender } from '@khairold/xml-render/react-native';
```

## Parsing Behavior

- **Unknown tags** pass through as literal text (not parsed)
- **Malformed/unclosed tags** fall back to text segments
- **XML entities** are decoded: `&lt;` `&gt;` `&amp;` `&quot;`
- **Attribute parsing** supports both single and double quotes
- **Case insensitive** tag matching

## Error Handling

Each segment is wrapped in an ErrorBoundary. If a component throws:
- **Development**: Shows error message with segment type
- **Production**: Renders a hidden/minimal fallback

```tsx
// Custom error handling
<XmlRender
  segments={segments}
  catalog={catalog}
  errorFallback={(error, segmentType) => (
    <div className="render-error">
      Failed to render {segmentType}
    </div>
  )}
/>
```

## License

MIT
