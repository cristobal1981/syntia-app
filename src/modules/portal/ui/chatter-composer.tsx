'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline as UnderlineIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalChatter } from '@/content/portal-chatter'
import { isChatterHtmlEmpty } from '@/src/modules/portal/domain/filter-portal-messages'
import {
  formatChatterShortcut,
} from '@/src/modules/portal/lib/chatter-shortcuts'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { cn } from '@/lib/utils'

export type ChatterComposerHandle = {
  clear: () => void
  getHtml: () => string
  isEmpty: () => boolean
}

type ChatterComposerProps = {
  disabled?: boolean
  resetToken?: number
  variant?: 'full' | 'simple'
  onEmptyChange?: (empty: boolean) => void
  onResize?: () => void
  onSubmit?: () => void
  editorMaxHeightClass?: string
}

type FormatToolbarButtonProps = {
  label: string
  shortcut: string[]
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function FormatToolbarButton({
  label,
  shortcut,
  active = false,
  disabled = false,
  onClick,
  children,
}: FormatToolbarButtonProps) {
  const shortcutLabel = formatChatterShortcut(shortcut)

  return (
    <PortalActionTooltip content={shortcutLabel} disabled={disabled}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'size-8 shrink-0',
          active && 'bg-accent text-accent-foreground dark:bg-accent/50'
        )}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
      >
        {children}
      </Button>
    </PortalActionTooltip>
  )
}

export const ChatterComposer = forwardRef<ChatterComposerHandle, ChatterComposerProps>(
  function ChatterComposer(
    {
      disabled = false,
      resetToken = 0,
      variant = 'full',
      onEmptyChange,
      onResize,
      onSubmit,
      editorMaxHeightClass = 'max-h-[120px]',
    },
    ref
  ) {
    const [isEmpty, setIsEmpty] = useState(true)
    const [, setToolbarRevision] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<ReturnType<typeof useEditor>>(null)
    const onEmptyChangeRef = useRef(onEmptyChange)
    const onSubmitRef = useRef(onSubmit)

    useEffect(() => {
      onEmptyChangeRef.current = onEmptyChange
    }, [onEmptyChange])

    useEffect(() => {
      onSubmitRef.current = onSubmit
    }, [onSubmit])

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          blockquote: false,
          code: false,
          codeBlock: false,
          heading: false,
          horizontalRule: false,
          strike: false,
          underline: false,
        }),
        Underline,
        Placeholder.configure({
          placeholder: portalChatter.composerPlaceholder,
        }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn(
            'min-h-10 overflow-y-auto px-4 py-2.5 text-sm leading-5 outline-none [&_p]:m-0 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
            editorMaxHeightClass
          ),
        },
        handleKeyDown: (_view, event) => {
          if (event.ctrlKey || event.metaKey) {
            if (event.shiftKey) {
              const key = event.key.toLowerCase()
              if (key === 'l') {
                event.preventDefault()
                editorRef.current?.chain().focus().toggleBulletList().run()
                return true
              }
              if (key === 'o') {
                event.preventDefault()
                editorRef.current?.chain().focus().toggleOrderedList().run()
                return true
              }
            }

            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmitRef.current?.()
              return true
            }
          }

          return false
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        const empty = isChatterHtmlEmpty(currentEditor.getHTML())
        setIsEmpty(empty)
        onEmptyChangeRef.current?.(empty)
      },
      onSelectionUpdate: () => {
        setToolbarRevision((value) => value + 1)
      },
      onTransaction: () => {
        setToolbarRevision((value) => value + 1)
      },
    })

    editorRef.current = editor

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          editor?.commands.clearContent(true)
          setIsEmpty(true)
          onEmptyChangeRef.current?.(true)
        },
        getHtml: () => editor?.getHTML() ?? '',
        isEmpty: () => isChatterHtmlEmpty(editor?.getHTML() ?? ''),
      }),
      [editor]
    )

    useEffect(() => {
      if (!editor) return
      editor.setEditable(!disabled)
    }, [disabled, editor])

    useEffect(() => {
      if (!editor) return
      editor.commands.clearContent(true)
      setIsEmpty(true)
      onEmptyChangeRef.current?.(true)
    }, [editor, resetToken])

    useEffect(() => {
      const node = rootRef.current
      if (!node || !onResize) return

      const observer = new ResizeObserver(() => {
        onResize()
      })
      observer.observe(node)
      return () => observer.disconnect()
    }, [onResize])

    return (
      <div ref={rootRef} className="min-w-0 flex-1">
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring dark:border-border/50',
            disabled && 'opacity-60'
          )}
        >
          {variant === 'full' ? (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1 py-0.5 dark:border-border/50">
            <FormatToolbarButton
              label={portalChatter.formatBold}
              shortcut={['Mod', 'B']}
              active={editor?.isActive('bold') ?? false}
              disabled={disabled || !editor}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="size-4" aria-hidden />
            </FormatToolbarButton>
            <FormatToolbarButton
              label={portalChatter.formatItalic}
              shortcut={['Mod', 'I']}
              active={editor?.isActive('italic') ?? false}
              disabled={disabled || !editor}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="size-4" aria-hidden />
            </FormatToolbarButton>
            <FormatToolbarButton
              label={portalChatter.formatUnderline}
              shortcut={['Mod', 'U']}
              active={editor?.isActive('underline') ?? false}
              disabled={disabled || !editor}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="size-4" aria-hidden />
            </FormatToolbarButton>
            <FormatToolbarButton
              label={portalChatter.formatBulletList}
              shortcut={['Mod', 'Shift', 'L']}
              active={editor?.isActive('bulletList') ?? false}
              disabled={disabled || !editor}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="size-4" aria-hidden />
            </FormatToolbarButton>
            <FormatToolbarButton
              label={portalChatter.formatOrderedList}
              shortcut={['Mod', 'Shift', 'O']}
              active={editor?.isActive('orderedList') ?? false}
              disabled={disabled || !editor}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="size-4" aria-hidden />
            </FormatToolbarButton>
          </div>
          ) : null}
          <EditorContent editor={editor} />
        </div>
        <span className="sr-only" aria-live="polite">
          {isEmpty ? portalChatter.composerEmpty : portalChatter.composerHasContent}
        </span>
      </div>
    )
  }
)
