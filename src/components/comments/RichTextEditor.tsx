import React, { useRef, useEffect, useMemo, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Custom AutoLink module as a proper Quill module class
class AutoLinkModule {
  quill: any;
  
  constructor(quill: any) {
    this.quill = quill;
    this.handleKeydown = this.handleKeydown.bind(this);
    this.init();
  }

  init() {
    this.quill.root.addEventListener("keydown", this.handleKeydown, false);
    this.quill.root.parentNode.style.position = this.quill.root.parentNode.style.position || "relative";
  }

  handleKeydown(evt: KeyboardEvent) {
    if (evt.key === " ") {
      const selection = this.quill.getSelection();
      if (!selection || selection.length !== 0) return;

      const [leaf, offset] = this.quill.getLeaf(selection.index);
      if (!leaf.text) return;

      const leafIndex = this.quill.getIndex(leaf);
      const textBefore = leaf.text.substring(0, offset);
      const match = textBefore.match(/\S+$/);
      if (!match || match[0].length < 3) return;

      const word = match[0];
      const wordStart = leafIndex + (match.index || 0);

      if (this.isUrl(word)) {
        let url = word;
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = "https://" + url;
        }
        this.quill.formatText(wordStart, word.length, "link", url, "user");
      }
    }
  }

  isUrl(str: string): boolean {
    const urlRegex = /^(https?:\/\/|www\.)[\w-\.]+\.[\w-\.]+(\/[\S]*)?$/i;
    return urlRegex.test(str);
  }
}

// Register the module globally once
let isModuleRegistered = false;
if (!isModuleRegistered) {
  try {
    ReactQuill.Quill.register("modules/autoLink", AutoLinkModule, true);
    isModuleRegistered = true;
  } catch (error) {
    console.error("Failed to register AutoLink module:", error);
  }
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string, delta: any, source: string, editor: any) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showCounter?: boolean;
  editorRef?: React.MutableRefObject<{ getEditor: () => any } | null>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength = 2000,
  showCounter = true,
  editorRef,
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const [charCount, setCharCount] = useState(0);

  // Assign editor instance to editorRef and add clipboard matcher
  useEffect(() => {
    if (quillRef.current && editorRef) {
      const quill = quillRef.current.getEditor();
      editorRef.current = {
        getEditor: () => quill || null,
      };

      // Add clipboard matcher for auto-linking on paste
      try {
        const Delta = ReactQuill.Quill.import('delta');
        const urlRegex = /(https?:\/\/|www\.)[\w-\.]+\.[\w-\.]+(\/[\S]*)?/gi;
        
        quill.clipboard.addMatcher(3 /* TEXT_NODE */, (node: any, delta: any) => {
          const text = node.data;
          let newDelta = new Delta();
          let pos = 0;
          let match;
          
          while ((match = urlRegex.exec(text)) !== null) {
            if (match.index > pos) {
              newDelta.insert(text.slice(pos, match.index));
            }
            let url = match[0];
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
              url = "https://" + url;
            }
            newDelta.insert(url, { link: url });
            pos = match.index + match[0].length;
          }
          
          if (pos < text.length) {
            newDelta.insert(text.slice(pos));
          }
          
          return newDelta.length() > 0 ? newDelta : delta;
        });
      } catch (error) {
        console.error("Failed to set up clipboard matcher:", error);
      }
    }
  }, [editorRef]);

  // Update character count and auto-resize
  useEffect(() => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const length = editor.getLength() - 1;
      setCharCount(length);

      // Auto-resize: Adjust the editor height based on content
      const editorElement = editor.root;
      editorElement.style.height = "auto";
      const scrollHeight = editorElement.scrollHeight;
      editorElement.style.height = `${Math.max(scrollHeight, 64)}px`; // Minimum height of 64px (~4rem)
    }
  }, [value]);

  const handleInternalChange = (value: string, delta: any, source: string, editor: any) => {
    const length = editor.getLength() - 1;
    if (length > maxLength && source === "user") {
      quillRef.current?.getEditor().history.undo();
      return;
    }
    setCharCount(length);
    onChange(value, delta, source, editor);
  };

  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"], // Added underline for Ctrl+U
        [{ list: "bullet" }],
      ],
      autoLink: isModuleRegistered, // Only enable if module was registered successfully
    }),
    []
  );

  const formats = ["bold", "italic", "underline", "list", "bullet", "link"]; // Added underline and link

  return (
    <div className="relative">
      <ReactQuill
        ref={quillRef}
        value={value}
        onChange={handleInternalChange}
        placeholder={placeholder}
        readOnly={disabled}
        modules={modules}
        formats={formats}
        theme="snow"
        className="[&_.ql-container]:bg-transparent [&_.ql-container]:border [&_.ql-container]:border-primary-500/10 [&_.ql-container]:hover:border-primary-500/20 [&_.ql-container]:h-auto [&_.ql-editor]:px-3 [&_.ql-editor]:py-3 [&_.ql-editor]:text-light-1 [&_.ql-editor]:text-sm [&_.ql-editor]:font-inter [&_.ql-editor]:min-h-[4rem] [&_.ql-editor]:h-auto [&_.ql-editor]:resize-y [&_.ql-editor.ql-blank::before]:text-light-4 [&_.ql-toolbar]:bg-dark-2/30 [&_.ql-toolbar]:border-primary-500/10 [&_.ql-toolbar]:hover:border-primary-500/20 [&_.ql-toolbar]:rounded-t-lg"
      />
      {showCounter && (
        <div className="absolute bottom-1 right-3 text-xs text-light-4">
          {charCount}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;