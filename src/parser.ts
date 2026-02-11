/**
 * XML Parser for xml-render
 *
 * Creates a registry-aware parser that converts text containing XML-like tags
 * into typed segments. Supports complete text parsing and streaming.
 */
import type { Registry, TagDefinitions, InferAttributes } from "./registry";

/**
 * A parsed segment representing either plain text or a recognized tag
 */
export interface ParsedSegment<
  TDefs extends TagDefinitions = TagDefinitions,
  TType extends keyof TDefs | "text" = keyof TDefs | "text",
> {
  /** The segment type: 'text' or a registered tag name */
  type: TType;
  /** The content inside the tag, or the text content for 'text' segments */
  content: string;
  /** Attributes parsed from the tag (undefined for 'text' segments) */
  attributes?: TType extends keyof TDefs
    ? InferAttributes<TDefs[TType]>
    : undefined;
}

/**
 * A partial segment representing an in-progress tag during streaming
 */
export interface PartialSegment<
  TDefs extends TagDefinitions = TagDefinitions,
  TType extends keyof TDefs = keyof TDefs,
> {
  /** The tag type being streamed */
  type: TType;
  /** The partial content received so far */
  content: string;
  /** Attributes parsed from the opening tag */
  attributes?: InferAttributes<TDefs[TType]>;
  /** Literal discriminant indicating this segment is still streaming */
  streaming: true;
}

/**
 * Union of all segment types for a given registry
 */
export type SegmentType<TDefs extends TagDefinitions> = keyof TDefs | "text";

/**
 * A segment array that can contain any valid segment for the registry
 */
export type Segments<TDefs extends TagDefinitions> = Array<
  ParsedSegment<TDefs, keyof TDefs | "text">
>;

/**
 * Decode basic XML entities
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');
}

/**
 * Parse attributes from an attribute string
 * Handles both single and double quoted values
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attrString) return attrs;

  // Match key="value" or key='value' patterns
  // Each quote type only terminates at its own matching quote
  const pattern = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]] = decodeXmlEntities(match[2] ?? match[3]);
  }
  return attrs;
}

/**
 * Parser state for handling incomplete/streaming content
 */
export interface ParserState {
  /** Accumulated text buffer */
  buffer: string;
  /** Whether we're currently inside an unclosed component tag */
  inComponent: boolean;
  /** The tag name being processed, if any */
  currentTag: string | null;
  /** Attributes string for the current tag */
  currentAttrs: string;
  /** Index in buffer where current tag started */
  tagStartIndex: number;
}

/**
 * Result of parsing a streaming chunk
 */
export interface StreamingParseResult<TDefs extends TagDefinitions> {
  /** Segments that are complete and can be rendered */
  segments: Segments<TDefs>;
  /** Updated parser state for next chunk */
  state: ParserState;
  /** Whether we're currently buffering (waiting for more data) */
  isBuffering: boolean;
  /** The type of tag being buffered, if any */
  bufferingTag: keyof TDefs | null;
  /** The in-progress segment being streamed, if any */
  partialSegment?: PartialSegment<TDefs>;
}

/**
 * Parser interface returned by createParser
 */
export interface Parser<TDefs extends TagDefinitions> {
  /**
   * Parse a complete text string into segments.
   * This is the main entry point for non-streaming use cases.
   *
   * @param text - The complete text to parse
   * @returns Array of parsed segments in order
   */
  parse(text: string): Segments<TDefs>;

  /**
   * Create initial parser state for streaming parsing.
   *
   * @returns Fresh parser state
   */
  createState(): ParserState;

  /**
   * Parse a chunk of streaming text.
   * Handles incomplete tags by buffering until complete.
   *
   * @param chunk - New text chunk to process
   * @param state - Current parser state
   * @returns Parse result with complete segments and updated state
   */
  parseChunk(chunk: string, state: ParserState): StreamingParseResult<TDefs>;

  /**
   * Finalize parsing, returning any remaining buffered content as text.
   * Call this when streaming is complete.
   *
   * @param state - Current parser state
   * @returns Final segments including any buffered content
   */
  finalize(state: ParserState): Segments<TDefs>;

  /** The registry used by this parser */
  readonly registry: Registry<TDefs>;
}

/**
 * Create a parser instance bound to a registry.
 *
 * The parser recognizes tags defined in the registry and converts them
 * into typed segments. Unknown tags are treated as literal text.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createRegistry, createParser } from '@khairold/xml-render';
 *
 * const registry = createRegistry({
 *   callout: {
 *     schema: z.object({ type: z.enum(['info', 'warning', 'error']) }),
 *     hasContent: true,
 *   },
 *   image: {
 *     schema: z.object({ src: z.string(), alt: z.string().optional() }),
 *     selfClosing: true,
 *   },
 * });
 *
 * const parser = createParser(registry);
 *
 * const segments = parser.parse('Hello <callout type="info">Important!</callout> World');
 * // [
 * //   { type: 'text', content: 'Hello ' },
 * //   { type: 'callout', content: 'Important!', attributes: { type: 'info' } },
 * //   { type: 'text', content: ' World' },
 * // ]
 * ```
 *
 * @param registry - The tag registry to use for parsing
 * @returns A parser instance
 */
export function createParser<TDefs extends TagDefinitions>(
  registry: Registry<TDefs>
): Parser<TDefs> {
  // Build regex patterns for registered tags
  const tagNames = registry.tagNames;

  // Pattern to match opening tags: <tagname ...> or <tagname ... />
  // Using alternation for exact tag name matching
  const tagNamesPattern = tagNames.map(escapeRegex).join("|");
  const openingTagPattern = new RegExp(
    `<(${tagNamesPattern})(\\s+[^>]*)?(\\/)?>`,
    "i"
  );

  /**
   * Create a segment from parsed tag information
   */
  function createSegment(
    tagName: string,
    attrString: string,
    content: string
  ): ParsedSegment<TDefs> {
    const rawAttrs = parseAttributes(attrString);
    const normalizedTagName = tagName.toLowerCase();

    // Validate and transform attributes using registry schema
    const validationResult = registry.validateAttributes(
      normalizedTagName as keyof TDefs,
      rawAttrs
    );

    return {
      type: normalizedTagName as keyof TDefs,
      content: decodeXmlEntities(content),
      attributes: validationResult.success
        ? validationResult.data
        : (rawAttrs as InferAttributes<TDefs[keyof TDefs]>),
    } as ParsedSegment<TDefs>;
  }

  /**
   * Add text to segments if non-empty
   */
  function addTextSegment(
    segments: Segments<TDefs>,
    text: string
  ): void {
    const trimmed = text;
    if (trimmed) {
      segments.push({
        type: "text" as const,
        content: decodeXmlEntities(trimmed),
        attributes: undefined,
      } as ParsedSegment<TDefs, "text">);
    }
  }

  /**
   * Parse complete text into segments
   */
  function parse(text: string): Segments<TDefs> {
    const segments: Segments<TDefs> = [];
    let remaining = text;
    let textBuffer = "";

    while (remaining.length > 0) {
      // Check for opening tag
      const openMatch = remaining.match(openingTagPattern);

      if (openMatch) {
        const tagIndex = remaining.indexOf(openMatch[0]);

        if (tagIndex > 0) {
          // Add text before the tag to buffer
          textBuffer += remaining.slice(0, tagIndex);
          remaining = remaining.slice(tagIndex);
          continue;
        }

        const tagName = openMatch[1].toLowerCase();
        const attrStr = openMatch[2] || "";
        const isSelfClosing = openMatch[3] === "/" || registry.isSelfClosing(tagName as keyof TDefs);

        if (isSelfClosing) {
          // Flush text buffer
          if (textBuffer) {
            addTextSegment(segments, textBuffer);
            textBuffer = "";
          }

          // Create segment for self-closing tag
          const segment = createSegment(tagName, attrStr, "");
          segments.push(segment);

          remaining = remaining.slice(openMatch[0].length);
          continue;
        }

        // Look for closing tag
        const closingTagPattern = new RegExp(`</${escapeRegex(tagName)}>`, "i");
        const closeMatch = remaining.match(closingTagPattern);

        if (closeMatch) {
          const closeIndex = remaining.indexOf(closeMatch[0]);

          // Flush text buffer
          if (textBuffer) {
            addTextSegment(segments, textBuffer);
            textBuffer = "";
          }

          // Extract content between tags
          const contentStart = openMatch[0].length;
          const content = remaining.slice(contentStart, closeIndex);

          // Create segment
          const segment = createSegment(tagName, attrStr, content);
          segments.push(segment);

          // Move past closing tag
          remaining = remaining.slice(closeIndex + closeMatch[0].length);
        } else {
          // No closing tag found - treat as malformed, add as text
          textBuffer += openMatch[0];
          remaining = remaining.slice(openMatch[0].length);
        }
      } else {
        // No more tags, add rest to text buffer
        textBuffer += remaining;
        remaining = "";
      }
    }

    // Flush remaining text
    if (textBuffer) {
      addTextSegment(segments, textBuffer);
    }

    return segments;
  }

  /**
   * Create initial parser state for streaming
   */
  function createState(): ParserState {
    return {
      buffer: "",
      inComponent: false,
      currentTag: null,
      currentAttrs: "",
      tagStartIndex: 0,
    };
  }

  /**
   * Parse a streaming chunk with state management
   */
  function parseChunk(
    chunk: string,
    state: ParserState
  ): StreamingParseResult<TDefs> {
    const newState: ParserState = { ...state };
    newState.buffer += chunk;

    const segments: Segments<TDefs> = [];
    let textBuffer = "";
    let remaining = newState.buffer;
    let processedUpTo = 0;

    while (remaining.length > 0) {
      if (newState.inComponent && newState.currentTag) {
        // Look for closing tag
        const closingPattern = new RegExp(
          `</${escapeRegex(newState.currentTag)}>`,
          "i"
        );
        const closeMatch = remaining.match(closingPattern);

        if (closeMatch) {
          const closeIndex = remaining.indexOf(closeMatch[0]);

          // We have a complete component
          const content = remaining.slice(0, closeIndex);
          const segment = createSegment(
            newState.currentTag,
            newState.currentAttrs,
            content
          );
          segments.push(segment);

          // Reset state
          remaining = remaining.slice(closeIndex + closeMatch[0].length);
          processedUpTo = newState.buffer.length - remaining.length;
          newState.inComponent = false;
          newState.currentTag = null;
          newState.currentAttrs = "";
        } else {
          // Still waiting for closing tag
          break;
        }
      } else {
        // Check for opening tag
        const openMatch = remaining.match(openingTagPattern);

        if (openMatch) {
          const tagIndex = remaining.indexOf(openMatch[0]);

          if (tagIndex > 0) {
            // Text before the tag
            textBuffer += remaining.slice(0, tagIndex);
            remaining = remaining.slice(tagIndex);
            continue;
          }

          // Check if it might be an incomplete tag at the end
          // Only buffer if the potential tag is at the very end and looks incomplete
          if (remaining.endsWith("<") || /^<[^>]*$/.test(remaining)) {
            // Potentially incomplete tag, keep buffering
            break;
          }

          const tagName = openMatch[1].toLowerCase();
          const attrStr = openMatch[2] || "";
          const isSelfClosing =
            openMatch[3] === "/" ||
            registry.isSelfClosing(tagName as keyof TDefs);

          if (isSelfClosing) {
            // Flush text buffer
            if (textBuffer) {
              addTextSegment(segments, textBuffer);
              textBuffer = "";
            }

            // Create segment for self-closing tag
            const segment = createSegment(tagName, attrStr, "");
            segments.push(segment);

            remaining = remaining.slice(openMatch[0].length);
            processedUpTo = newState.buffer.length - remaining.length;
            continue;
          }

          // Start of a component tag with content
          if (textBuffer) {
            addTextSegment(segments, textBuffer);
            textBuffer = "";
          }

          newState.inComponent = true;
          newState.currentTag = tagName;
          newState.currentAttrs = attrStr;
          newState.tagStartIndex = processedUpTo;

          remaining = remaining.slice(openMatch[0].length);
          processedUpTo = newState.buffer.length - remaining.length;
        } else {
          // No tag found, check for potential incomplete tag at end
          const potentialTagStart = remaining.lastIndexOf("<");
          if (
            potentialTagStart !== -1 &&
            potentialTagStart > remaining.length - 20
          ) {
            // Might be start of a tag, buffer it
            textBuffer += remaining.slice(0, potentialTagStart);
            remaining = remaining.slice(potentialTagStart);
            break;
          }

          // No tags, all text
          textBuffer += remaining;
          remaining = "";
          processedUpTo = newState.buffer.length;
        }
      }
    }

    // Add remaining text to complete segments if not buffering
    if (!newState.inComponent && textBuffer) {
      addTextSegment(segments, textBuffer);
      textBuffer = "";
    }

    // Update buffer to only contain unprocessed content
    newState.buffer = remaining + textBuffer;

    // Build partialSegment when inside an open tag
    let partialSegment: PartialSegment<TDefs> | undefined;
    if (newState.inComponent && newState.currentTag) {
      const rawAttrs = parseAttributes(newState.currentAttrs);
      const normalizedTag = newState.currentTag.toLowerCase();
      const validationResult = registry.validateAttributes(
        normalizedTag as keyof TDefs,
        rawAttrs
      );
      partialSegment = {
        type: normalizedTag as keyof TDefs,
        content: decodeXmlEntities(remaining),
        attributes: validationResult.success
          ? validationResult.data
          : (rawAttrs as InferAttributes<TDefs[keyof TDefs]>),
        streaming: true,
      } as PartialSegment<TDefs>;
    }

    return {
      segments,
      state: newState,
      isBuffering: newState.inComponent || newState.buffer.length > 0,
      bufferingTag: newState.inComponent
        ? (newState.currentTag as keyof TDefs)
        : null,
      partialSegment,
    };
  }

  /**
   * Finalize parsing, returning any remaining buffered content as text
   */
  function finalize(state: ParserState): Segments<TDefs> {
    const segments: Segments<TDefs> = [];

    if (state.buffer) {
      // Return buffered content as raw text (malformed component fallback)
      segments.push({
        type: "text" as const,
        content: decodeXmlEntities(state.buffer),
        attributes: undefined,
      } as ParsedSegment<TDefs, "text">);
    }

    return segments;
  }

  return {
    parse,
    createState,
    parseChunk,
    finalize,
    registry,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
