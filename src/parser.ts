/**
 * XML Parser for xml-render
 *
 * Creates a registry-aware parser that converts text containing XML-like tags
 * into typed segments. Supports complete text parsing and streaming.
 */
import type {
  Registry,
  TagDefinitions,
  InferAttributes,
  ParsedSegment,
  PartialSegment,
  SegmentType,
  Segments,
  ParserState,
  StreamingParseResult,
  Parser,
} from "./types";

// Re-export types for backwards compatibility
export type {
  ParsedSegment,
  PartialSegment,
  SegmentType,
  Segments,
  ParserState,
  StreamingParseResult,
  Parser,
} from "./types";

/**
 * Maximum number of characters from the end of a buffer to check
 * for potential incomplete tag starts
 */
const MAX_INCOMPLETE_TAG_LENGTH = 20;

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
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
   * Process the case where we're inside an open component tag,
   * looking for the closing tag.
   *
   * @returns The remaining unprocessed string, or null if still waiting for closing tag
   */
  function processInsideComponent(
    remaining: string,
    newState: ParserState,
    segments: Segments<TDefs>
  ): string | null {
    const closingPattern = new RegExp(
      `</${escapeRegex(newState.currentTag!)}>`,
      "i"
    );
    const closeMatch = remaining.match(closingPattern);

    if (closeMatch) {
      const closeIndex = remaining.indexOf(closeMatch[0]);

      // We have a complete component
      const content = remaining.slice(0, closeIndex);
      const segment = createSegment(
        newState.currentTag!,
        newState.currentAttrs,
        content
      );
      segments.push(segment);

      // Reset state
      const afterClose = remaining.slice(closeIndex + closeMatch[0].length);
      newState.inComponent = false;
      newState.currentTag = null;
      newState.currentAttrs = "";
      return afterClose;
    }

    // Still waiting for closing tag
    return null;
  }

  /**
   * Process text looking for an opening tag.
   *
   * @returns Object with the remaining string and updated textBuffer,
   *          or null if we should break out of the loop (buffering)
   */
  function processOpenTag(
    remaining: string,
    newState: ParserState,
    segments: Segments<TDefs>,
    textBuffer: string,
    processedUpTo: number,
    bufferLength: number
  ): { remaining: string; textBuffer: string; processedUpTo: number } | null {
    const openMatch = remaining.match(openingTagPattern);

    if (openMatch) {
      const tagIndex = remaining.indexOf(openMatch[0]);

      if (tagIndex > 0) {
        // Text before the tag
        return {
          remaining: remaining.slice(tagIndex),
          textBuffer: textBuffer + remaining.slice(0, tagIndex),
          processedUpTo,
        };
      }

      // Check if it might be an incomplete tag at the end
      if (remaining.endsWith("<") || /^<[^>]*$/.test(remaining)) {
        return null;
      }

      const tagName = openMatch[1].toLowerCase();
      const attrStr = openMatch[2] || "";
      const isSelfClosing =
        openMatch[3] === "/" ||
        registry.isSelfClosing(tagName as keyof TDefs);

      if (isSelfClosing) {
        if (textBuffer) {
          addTextSegment(segments, textBuffer);
          textBuffer = "";
        }

        const segment = createSegment(tagName, attrStr, "");
        segments.push(segment);

        const afterTag = remaining.slice(openMatch[0].length);
        return {
          remaining: afterTag,
          textBuffer,
          processedUpTo: bufferLength - afterTag.length,
        };
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

      const afterTag = remaining.slice(openMatch[0].length);
      return {
        remaining: afterTag,
        textBuffer,
        processedUpTo: bufferLength - afterTag.length,
      };
    }

    // No tag found, check for potential incomplete tag at end
    const potentialTagStart = remaining.lastIndexOf("<");
    if (
      potentialTagStart !== -1 &&
      potentialTagStart > remaining.length - MAX_INCOMPLETE_TAG_LENGTH
    ) {
      // Might be start of a tag, buffer it
      return {
        remaining: remaining.slice(potentialTagStart),
        textBuffer: textBuffer + remaining.slice(0, potentialTagStart),
        processedUpTo: bufferLength - remaining.slice(potentialTagStart).length,
      };
    }

    // No tags, all text
    return {
      remaining: "",
      textBuffer: textBuffer + remaining,
      processedUpTo: bufferLength,
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
        const result = processInsideComponent(remaining, newState, segments);
        if (result !== null) {
          remaining = result;
          processedUpTo = newState.buffer.length - remaining.length;
        } else {
          break;
        }
      } else {
        const result = processOpenTag(
          remaining,
          newState,
          segments,
          textBuffer,
          processedUpTo,
          newState.buffer.length
        );
        if (result === null) {
          break;
        }
        remaining = result.remaining;
        textBuffer = result.textBuffer;
        processedUpTo = result.processedUpTo;
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
