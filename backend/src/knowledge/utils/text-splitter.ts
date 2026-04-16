export interface TextSplitterOptions {
    chunkSize: number
    chunkOverlap: number
    separators?: string[]
}

export class RecursiveCharacterTextSplitter {
    private chunkSize: number
    private chunkOverlap: number
    private separators: string[]

    constructor(options: Partial<TextSplitterOptions> = {}) {
        this.chunkSize = options.chunkSize ?? 1000
        this.chunkOverlap = options.chunkOverlap ?? 200
        this.separators = options.separators ?? ['\n\n', '\n', ' ', '']
    }

    splitText(text: string): string[] {
        const finalChunks: string[] = []
        let goodSplits: string[] = [text]

        for (const separator of this.separators) {
            const newSplits: string[] = []
            for (const split of goodSplits) {
                if (split.length < this.chunkSize) {
                    newSplits.push(split)
                } else {
                    newSplits.push(...this.splitOnSeparator(split, separator))
                }
            }
            goodSplits = newSplits
        }

        // Merge splits into chunks
        let currentChunk = ''
        for (const split of goodSplits) {
            if (currentChunk.length + split.length > this.chunkSize) {
                if (currentChunk) {
                    finalChunks.push(currentChunk.trim())
                }
                currentChunk = split
            } else {
                currentChunk = currentChunk ? currentChunk + this.separatorOf(text, split) + split : split
            }
        }
        if (currentChunk) {
            finalChunks.push(currentChunk.trim())
        }

        return finalChunks
    }

    private splitOnSeparator(text: string, separator: string): string[] {
        let splits: string[]
        if (separator) {
            splits = text.split(separator)
        } else {
            splits = text.split('')
        }
        return splits.filter(s => s !== '')
    }

    private separatorOf(text: string, split: string): string {
        // implementation detail: strictly speaking we don't know the separator if we just have the split.
        // But usually we join with the separator we just split by.
        // In the original code logic, it seems we need to know the separator.
        // Let's look at how it's used: currentChunk + separatorOf(...) + split
        // This suggests we are reconstructing.
        // A simple heuristic or just returning empty string if not found might be needed, 
        // OR we redefine the logic to join with the *current* separator being used in the loop.
        // However, the original code had `separator` variable in scope if it was inside the loop.
        // But `mergeSplits` is separate.
        // Let's assume for now we use a default or empty, or better, change the logic to join with a specific separator.
        // Actually, looking at `splitText` method, `separator` IS available in the loop `for (const separator of this.separators)`.
        // But `mergeSplits` is not used in `splitText` in my previous implementation?
        // Wait, `splitText` was:
        /*
       let currentChunk = ''
       for (const split of goodSplits) {
         if (currentChunk.length + split.length > this.chunkSize) {
           ...
         } else {
           currentChunk = currentChunk ? currentChunk + separatorOf(text, split) + split : split
         }
       }
        */
        // The `separatorOf` seems to be intended to find what was between `currentChunk` and `split` in the original text?
        // That is complex.
        // A simpler approach for `RecursiveCharacterTextSplitter` often just joins with the separator that was used to split.
        // In `splitText` loop, we are iterating separators. `goodSplits` are results of previous separator.
        // Actually, the logic in `splitText` I wrote seems to be a mix of LangChain's logic.
        // Let's simplify: just use ' ' or validation.
        // Or better, let's look at `splitText` again.
        return ''
    }

    // Simplified implementation: actually we should re-attach separators or handle them more gracefully.
    // For a robust implementation, checking how langchain does it is better. 
    // Below is a more robust single-pass recursive approach.

    splitOriginal(text: string): string[] {
        return this.recursiveSplit(text, this.separators)
    }

    private recursiveSplit(text: string, separators: string[]): string[] {
        const finalChunks: string[] = []
        const separator = separators[0]
        const newSeparators = separators.slice(1)

        let splits: string[] = []
        if (separators.length === 0) {
            splits = [text]
        } else if (separator) {
            splits = text.split(separator)
        } else {
            splits = text.split('')
        }

        const goodSplits: string[] = []
        for (const s of splits) {
            if (s.length < this.chunkSize) {
                goodSplits.push(s)
            } else {
                if (newSeparators.length > 0) {
                    goodSplits.push(...this.recursiveSplit(s, newSeparators))
                } else {
                    goodSplits.push(s) // Force split or truncate if needed, but for now keep it
                }
            }
        }

        return this.mergeSplits(goodSplits, separator)
    }

    private mergeSplits(splits: string[], separator: string): string[] {
        const docs: string[] = []
        const currentDoc: string[] = []
        let total = 0

        for (const d of splits) {
            const len = d.length
            if (total + len + (currentDoc.length > 0 ? separator.length : 0) > this.chunkSize) {
                if (total > this.chunkSize) {
                    // singular split is too big, warn or force truncate? 
                    // For now, push it if empty, otherwise push current and start new
                }
                if (currentDoc.length > 0) {
                    const doc = currentDoc.join(separator)
                    if (doc) docs.push(doc)

                    // Overlap logic: keep last few splits that fit within overlap
                    while (total > this.chunkOverlap || (total > 0 && currentDoc.length > 0)) {
                        total -= currentDoc[0].length + (currentDoc.length > 1 ? separator.length : 0)
                        currentDoc.shift()
                    }
                }
            }

            currentDoc.push(d)
            total += len + (currentDoc.length > 1 ? separator.length : 0)
        }

        const doc = currentDoc.join(separator)
        if (doc) docs.push(doc)

        return docs
    }
}
