import { ItemView, WorkspaceLeaf, MarkdownRenderer, setIcon } from "obsidian";
import type ColaPlugin from "./main";
import { ICON_SEND, ICON_STOP } from "./icons";

export const VIEW_TYPE_COLA = "cola-chat-view";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const PAGE_SIZE = 50;

export class ColaView extends ItemView {
  private plugin: ColaPlugin;
  private messages: ChatMessage[] = [];
  private chatContainer!: HTMLElement;
  private inputEl!: HTMLTextAreaElement;
  private statusEl!: HTMLElement;
  private fileInfoEl!: HTMLElement;
  private sendBtn!: HTMLButtonElement;
  private contextToggle!: HTMLElement;
  private contextEnabled = true;
  private isLoading = false;
  private quoteEl!: HTMLElement;
  private quotedText: string | null = null;
  private renderedCount = 0;
  private searchEl!: HTMLElement;
  private searchInputEl!: HTMLInputElement;
  private searchCountEl!: HTMLElement;
  private searchPrevBtn!: HTMLButtonElement;
  private searchNextBtn!: HTMLButtonElement;
  private isSearching = false;
  private searchMatches: number[] = [];
  private searchCurrentIdx = -1;

  constructor(leaf: WorkspaceLeaf, plugin: ColaPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_COLA;
  }

  getDisplayText(): string {
    return "Cola";
  }

  getIcon(): string {
    return "message-circle";
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("cola-chat-root");

    // Header
    const header = container.createEl("div", { cls: "cola-header" });
    const headerLeft = header.createEl("div", { cls: "cola-header-left" });
    headerLeft.createEl("span", { text: "Cola", cls: "cola-header-title" });
    this.statusEl = headerLeft.createEl("span", { cls: "cola-status" });
    this.updateStatus(this.plugin.gateway.isConnected);

    // File context bar
    const fileBar = container.createEl("div", { cls: "cola-file-bar" });
    this.fileInfoEl = fileBar.createEl("span", { cls: "cola-file-info" });
    this.contextToggle = fileBar.createEl("span", {
      cls: "cola-context-toggle cola-context-on",
      attr: { title: "点击切换：是否附带当前文件内容" },
    });
    // Build context toggle content with DOM API
    const clipIcon = this.contextToggle.createEl("span", { cls: "cola-toggle-icon" });
    setIcon(clipIcon, "paperclip");
    this.contextToggle.createEl("span", { cls: "cola-context-label", text: "附带文件" });

    this.contextToggle.addEventListener("click", () => {
      this.contextEnabled = !this.contextEnabled;
      const label = this.contextToggle.querySelector(".cola-context-label");
      if (label) label.textContent = this.contextEnabled ? "附带文件" : "不附带";
      this.contextToggle.toggleClass("cola-context-on", this.contextEnabled);
      this.contextToggle.toggleClass("cola-context-off", !this.contextEnabled);
    });
    this.updateFileInfo();

    // Search bar (hidden by default)
    this.searchEl = container.createEl("div", { cls: "cola-search-bar cola-hidden" });
    this.searchInputEl = this.searchEl.createEl("input", {
      attr: { placeholder: "搜索聊天记录...", type: "text" },
      cls: "cola-search-input",
    });
    const searchNav = this.searchEl.createEl("div", { cls: "cola-search-nav" });
    this.searchCountEl = searchNav.createEl("span", { cls: "cola-search-count" });
    this.searchPrevBtn = searchNav.createEl("button", { cls: "cola-search-nav-btn", attr: { title: "上一个" } });
    setIcon(this.searchPrevBtn, "chevron-up");
    this.searchNextBtn = searchNav.createEl("button", { cls: "cola-search-nav-btn", attr: { title: "下一个" } });
    setIcon(this.searchNextBtn, "chevron-down");
    const searchCloseBtn = searchNav.createEl("button", { cls: "cola-search-nav-btn", attr: { title: "关闭" } });
    setIcon(searchCloseBtn, "x");

    this.searchPrevBtn.addEventListener("click", () => this.navigateSearch(-1));
    this.searchNextBtn.addEventListener("click", () => this.navigateSearch(1));
    searchCloseBtn.addEventListener("click", () => this.toggleSearch(false));

    this.searchInputEl.addEventListener("input", () => {
      this.performSearch(this.searchInputEl.value.trim());
    });
    this.searchInputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.toggleSearch(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.navigateSearch(e.shiftKey ? -1 : 1);
      }
    });
    // Search toggle button in header
    const searchBtn = header.createEl("button", {
      cls: "cola-header-btn",
      attr: { title: "搜索" },
    });
    setIcon(searchBtn, "search");
    searchBtn.addEventListener("click", () => {
      this.toggleSearch(!this.isSearching);
    });

    // Chat messages area
    this.chatContainer = container.createEl("div", { cls: "cola-messages" });

    // Scroll to top to load more
    this.chatContainer.addEventListener("scroll", () => {
      if (this.chatContainer.scrollTop === 0 && this.renderedCount < this.messages.length && !this.isSearching) {
        this.loadMoreMessages();
      }
    });

    // Input area
    const inputArea = container.createEl("div", { cls: "cola-input-area" });

    // Quote block (hidden by default)
    this.quoteEl = inputArea.createEl("div", { cls: "cola-quote-block cola-hidden" });

    const inputWrapper = inputArea.createEl("div", { cls: "cola-input-wrapper" });
    this.inputEl = inputWrapper.createEl("textarea", {
      attr: { placeholder: "输入消息...", rows: "1" },
      cls: "cola-input",
    });
    this.sendBtn = inputWrapper.createEl("button", {
      cls: "cola-send-btn cola-send-btn-inactive",
    });
    this.setSendBtnIcon(ICON_SEND);

    // Input auto-resize
    this.inputEl.addEventListener("input", () => {
      this.autoResizeInput();
      this.updateSendBtnState();
    });

    // Event listeners
    this.sendBtn.addEventListener("click", () => {
      if (this.isLoading) return;
      void this.handleSend();
    });
    this.inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // Ignore Enter during IME composition
      if (e.isComposing) return;

      const shortcut = this.plugin.settings.sendShortcut;
      if (shortcut === "ctrl+enter") {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          void this.handleSend();
        }
      } else {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          void this.handleSend();
        }
      }
    });

    // Listen for file changes
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateFileInfo())
    );

    // Listen for Cola messages
    this.plugin.gateway.onMessage((text, actions) => {
      this.addMessage("assistant", text);
      this.setLoading(false);

      // Execute any actions from Cola
      if (actions && actions.length > 0) {
        for (const action of actions) {
          void this.plugin.executeAction(action);
        }
      }
    });

    // Listen for connection status
    this.plugin.gateway.onStatus((connected, message) => {
      this.updateStatus(connected, message);
    });

    // Restore saved messages
    await this.loadMessages();
  }

  async onClose(): Promise<void> {
    this.saveMessages();
  }

  clearChat(): void {
    this.messages = [];
    this.chatContainer.empty();
    this.saveMessages();
  }

  /** Send text directly as a message (from selection command) */
  sendText(text: string): void {
    if (this.isLoading) {
      this.fillInput(text);
      return;
    }
    const sent = this.plugin.gateway.send(text, null);
    if (!sent) return;
    this.addMessage("user", text);
    this.setLoading(true);
  }

  /** Fill input box with text (user can edit before sending) */
  fillInput(text: string): void {
    this.inputEl.value = text;
    this.autoResizeInput();
    this.inputEl.focus();
    this.updateSendBtnState();
  }

  /** Show selected text as a quote reference above input */
  quoteSelection(text: string): void {
    this.quotedText = text;
    this.quoteEl.empty();
    const quoteContent = this.quoteEl.createEl("div", { cls: "cola-quote-content" });
    quoteContent.setText(text);
    const dismissBtn = this.quoteEl.createEl("span", { cls: "cola-quote-dismiss", text: "×" });
    dismissBtn.addEventListener("click", () => this.clearQuote());
    this.quoteEl.removeClass("cola-hidden");
    this.inputEl.focus();
    this.inputEl.setAttribute("placeholder", "针对引用内容提问...");
    this.updateSendBtnState();
  }

  private clearQuote(): void {
    this.quotedText = null;
    this.quoteEl.addClass("cola-hidden");
    this.quoteEl.empty();
    this.inputEl.setAttribute("placeholder", "输入消息...");
  }

  private autoResizeInput(): void {
    this.inputEl.setCssStyles({ height: "auto" });
    const newHeight = Math.min(this.inputEl.scrollHeight, 120);
    this.inputEl.setCssStyles({ height: `${newHeight}px` });
  }

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if ((!text && !this.quotedText) || this.isLoading) return;

    // Build the message: if there's a quote, prepend it
    let messageToSend = text;
    let displayMessage = text;
    if (this.quotedText) {
      const quoted = this.quotedText;
      messageToSend = `> ${quoted.replace(/\n/g, "\n> ")}\n\n${text}`;
      displayMessage = messageToSend;
      this.clearQuote();
    }

    if (!messageToSend.trim()) return;

    const context = this.contextEnabled ? await this.getFileContext() : null;
    const sent = this.plugin.gateway.send(messageToSend, context);
    if (!sent) return;

    this.inputEl.value = "";
    this.inputEl.setCssStyles({ height: "auto" });
    this.addMessage("user", displayMessage);
    this.setLoading(true);
  }

  private async getFileContext(): Promise<{
    filePath: string;
    fileName: string;
    content: string;
  } | null> {
    const file = this.app.workspace.getActiveFile();
    if (!file) return null;
    try {
      const content = await this.app.vault.cachedRead(file);
      return { filePath: file.path, fileName: file.basename, content: content.slice(0, 10000) };
    } catch {
      return null;
    }
  }

  private addMessage(role: "user" | "assistant", content: string): void {
    const ts = Date.now();
    this.messages.push({ role, content, timestamp: ts });
    this.renderMessage(role, content, ts);
    this.saveMessages();
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private formatTime(ts: number): string {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    // Same day: just time
    if (d.toDateString() === now.toDateString()) return hm;
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hm}`;
    // Same year: month/day time
    if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
    // Different year
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hm}`;
  }

  private renderMessage(role: "user" | "assistant", content: string, timestamp?: number): void {
    const msgWrapper = this.chatContainer.createEl("div", {
      cls: `cola-msg-wrapper cola-msg-wrapper-${role}`,
    });

    const msgEl = msgWrapper.createEl("div", {
      cls: `cola-msg cola-msg-${role}`,
    });

    const contentEl = msgEl.createEl("div", { cls: "cola-msg-content" });

    if (role === "assistant") {
      // Render Markdown for assistant
      void MarkdownRenderer.render(this.app, content, contentEl, "", this);

      // Add copy buttons to code blocks
      const codeBlocks = contentEl.querySelectorAll("pre > code");
      codeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre) return;
        pre.addClass("cola-code-block");
        const copyBtn = pre.createEl("button", { cls: "cola-code-copy-btn" });
        setIcon(copyBtn, "copy");
        copyBtn.addEventListener("click", () => {
          void navigator.clipboard.writeText(codeEl.textContent ?? "");
          copyBtn.empty();
          setIcon(copyBtn, "check");
          window.setTimeout(() => { copyBtn.empty(); setIcon(copyBtn, "copy"); }, 1500);
        });
      });
    } else {
      // Plain text for user messages
      contentEl.setText(content);
    }

    // Message action buttons
    const msgActions = msgWrapper.createEl("div", { cls: "cola-msg-actions" });

    // Copy button
    const copyMsgBtn = msgActions.createEl("button", {
      cls: "cola-msg-action-btn",
      attr: { title: "复制" },
    });
    setIcon(copyMsgBtn, "copy");
    copyMsgBtn.addEventListener("click", () => {
      void navigator.clipboard.writeText(content);
      copyMsgBtn.empty();
      setIcon(copyMsgBtn, "check");
      window.setTimeout(() => { copyMsgBtn.empty(); setIcon(copyMsgBtn, "copy"); }, 1500);
    });

    // Insert button (assistant messages only)
    if (role === "assistant") {
      const insertBtn = msgActions.createEl("button", {
        cls: "cola-msg-action-btn",
        attr: { title: "插入到编辑器" },
      });
      setIcon(insertBtn, "arrow-down-to-line");
      insertBtn.addEventListener("click", () => {
        this.plugin.insertAtCursor(content);
        insertBtn.empty();
        setIcon(insertBtn, "check");
        window.setTimeout(() => { insertBtn.empty(); setIcon(insertBtn, "arrow-down-to-line"); }, 1500);
      });
    }

    // Timestamp
    if (timestamp) {
      msgActions.createEl("span", {
        cls: "cola-msg-time",
        text: this.formatTime(timestamp),
      });
    }
  }

  private setSendBtnIcon(svgContent: string): void {
    this.sendBtn.empty();
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "image/svg+xml");
    const svgEl = doc.documentElement;
    if (svgEl) {
      this.sendBtn.appendChild(activeDocument.importNode(svgEl, true));
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;

    if (loading) {
      this.setSendBtnIcon(ICON_STOP);
      this.sendBtn.addClass("cola-send-btn-loading");
      this.sendBtn.removeClass("cola-send-btn-inactive");
      this.sendBtn.disabled = true;

      const existing = this.chatContainer.querySelector(".cola-typing");
      if (!existing) {
        const typingEl = this.chatContainer.createEl("div", { cls: "cola-typing" });
        typingEl.createEl("span", { text: "Cola 正在思考" });
        const dots = typingEl.createEl("span", { cls: "cola-typing-dots" });
        dots.createEl("span", { cls: "cola-typing-dot" });
        dots.createEl("span", { cls: "cola-typing-dot" });
        dots.createEl("span", { cls: "cola-typing-dot" });
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      }
    } else {
      this.sendBtn.removeClass("cola-send-btn-loading");
      this.updateSendBtnState();

      const typingEl = this.chatContainer.querySelector(".cola-typing");
      if (typingEl) typingEl.remove();
    }
  }

  private updateSendBtnState(): void {
    if (this.isLoading) return;
    const hasContent = this.inputEl.value.trim().length > 0 || this.quotedText !== null;
    this.setSendBtnIcon(ICON_SEND);
    this.sendBtn.disabled = !hasContent;
    this.sendBtn.toggleClass("cola-send-btn-inactive", !hasContent);
    this.sendBtn.toggleClass("cola-send-btn-loading", false);
  }

  private updateFileInfo(): void {
    const file = this.app.workspace.getActiveFile();
    this.fileInfoEl.empty();
    if (file) {
      const fileIcon = this.fileInfoEl.createEl("span", { cls: "cola-file-icon" });
      setIcon(fileIcon, "file-text");
      this.fileInfoEl.createEl("span", { text: file.basename });
      this.fileInfoEl.title = file.path;
    } else {
      this.fileInfoEl.setText("无打开文件");
    }
  }

  private updateStatus(connected: boolean, message?: string): void {
    if (connected) {
      this.statusEl.setText("●");
      this.statusEl.title = "已连接";
    } else {
      this.statusEl.setText("○");
      this.statusEl.title = message ?? "未连接";
    }
    this.statusEl.toggleClass("cola-status-connected", connected);
    this.statusEl.toggleClass("cola-status-disconnected", !connected);
  }

  private saveMessages(): void {
    void this.plugin.saveData({ messages: this.messages, settings: this.plugin.settings });
  }

  private async loadMessages(): Promise<void> {
    try {
      const data = await this.plugin.loadData() as { messages?: ChatMessage[] } | null;
      if (data?.messages && Array.isArray(data.messages)) {
        this.messages = data.messages;
        // Render only the last PAGE_SIZE messages
        const startIdx = Math.max(0, this.messages.length - PAGE_SIZE);
        for (let i = startIdx; i < this.messages.length; i++) {
          this.renderMessage(this.messages[i].role, this.messages[i].content, this.messages[i].timestamp);
        }
        this.renderedCount = this.messages.length - startIdx;
        window.setTimeout(() => {
          this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 50);
      }
    } catch {
      // ignore load errors
    }
  }

  private loadMoreMessages(): void {
    const totalUnrendered = this.messages.length - this.renderedCount;
    if (totalUnrendered <= 0) return;

    const loadCount = Math.min(PAGE_SIZE, totalUnrendered);
    const startIdx = totalUnrendered - loadCount;

    // Save scroll position
    const prevHeight = this.chatContainer.scrollHeight;

    // Prepend older messages
    const fragment = document.createDocumentFragment();
    const tempContainer = document.createElement("div");
    for (let i = startIdx; i < startIdx + loadCount; i++) {
      this.renderMessageToContainer(tempContainer, this.messages[i].role, this.messages[i].content, this.messages[i].timestamp);
    }
    while (tempContainer.firstChild) {
      fragment.appendChild(tempContainer.firstChild);
    }
    this.chatContainer.insertBefore(fragment, this.chatContainer.firstChild);
    this.renderedCount += loadCount;

    // Restore scroll position
    window.setTimeout(() => {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight - prevHeight;
    }, 0);
  }

  private renderMessageToContainer(container: HTMLElement, role: "user" | "assistant", content: string, timestamp?: number): void {
    const msgWrapper = container.createEl("div", {
      cls: `cola-msg-wrapper cola-msg-wrapper-${role}`,
    });

    const msgEl = msgWrapper.createEl("div", {
      cls: `cola-msg cola-msg-${role}`,
    });

    const contentEl = msgEl.createEl("div", { cls: "cola-msg-content" });

    if (role === "assistant") {
      void MarkdownRenderer.render(this.app, content, contentEl, "", this);
    } else {
      contentEl.setText(content);
    }

    // Simplified actions for prepended messages
    const msgActions = msgWrapper.createEl("div", { cls: "cola-msg-actions" });
    const copyMsgBtn = msgActions.createEl("button", {
      cls: "cola-msg-action-btn",
      attr: { title: "复制" },
    });
    setIcon(copyMsgBtn, "copy");
    copyMsgBtn.addEventListener("click", () => {
      void navigator.clipboard.writeText(content);
      copyMsgBtn.empty();
      setIcon(copyMsgBtn, "check");
      window.setTimeout(() => { copyMsgBtn.empty(); setIcon(copyMsgBtn, "copy"); }, 1500);
    });

    if (role === "assistant") {
      const insertBtn = msgActions.createEl("button", {
        cls: "cola-msg-action-btn",
        attr: { title: "插入到编辑器" },
      });
      setIcon(insertBtn, "arrow-down-to-line");
      insertBtn.addEventListener("click", () => {
        this.plugin.insertAtCursor(content);
        insertBtn.empty();
        setIcon(insertBtn, "check");
        window.setTimeout(() => { insertBtn.empty(); setIcon(insertBtn, "arrow-down-to-line"); }, 1500);
      });
    }

    // Timestamp
    if (timestamp) {
      msgActions.createEl("span", {
        cls: "cola-msg-time",
        text: this.formatTime(timestamp),
      });
    }
  }

  private toggleSearch(show: boolean): void {
    this.isSearching = show;
    this.searchEl.toggleClass("cola-hidden", !show);
    if (show) {
      this.searchInputEl.focus();
    } else {
      this.searchInputEl.value = "";
      this.clearSearchHighlights();
      this.searchMatches = [];
      this.searchCurrentIdx = -1;
      this.searchCountEl.setText("");
      // Scroll to bottom (back to latest)
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  }

  private performSearch(query: string): void {
    this.clearSearchHighlights();
    this.searchMatches = [];
    this.searchCurrentIdx = -1;

    if (!query) {
      this.searchCountEl.setText("");
      return;
    }

    const lowerQuery = query.toLowerCase();

    // Find all matching message indices
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i].content.toLowerCase().includes(lowerQuery)) {
        this.searchMatches.push(i);
      }
    }

    if (this.searchMatches.length === 0) {
      this.searchCountEl.setText("无结果");
      return;
    }

    // Jump to the last (most recent) match
    this.searchCurrentIdx = this.searchMatches.length - 1;
    this.updateSearchCounter();
    this.scrollToCurrentMatch();
  }

  private navigateSearch(direction: number): void {
    if (this.searchMatches.length === 0) return;

    this.searchCurrentIdx += direction;
    if (this.searchCurrentIdx >= this.searchMatches.length) {
      this.searchCurrentIdx = 0;
    } else if (this.searchCurrentIdx < 0) {
      this.searchCurrentIdx = this.searchMatches.length - 1;
    }

    this.updateSearchCounter();
    this.scrollToCurrentMatch();
  }

  private updateSearchCounter(): void {
    if (this.searchMatches.length === 0) {
      this.searchCountEl.setText("无结果");
    } else {
      this.searchCountEl.setText(`${this.searchCurrentIdx + 1}/${this.searchMatches.length}`);
    }
  }

  private scrollToCurrentMatch(): void {
    if (this.searchCurrentIdx < 0 || this.searchMatches.length === 0) return;

    const msgIndex = this.searchMatches[this.searchCurrentIdx];

    // Ensure the message is rendered
    this.ensureMessageRendered(msgIndex);

    // Remove active highlight from previous
    this.chatContainer.querySelectorAll(".cola-search-active").forEach(el => {
      el.removeClass("cola-search-active");
    });

    // Highlight only the current match
    const currentStartIdx = this.messages.length - this.renderedCount;
    const wrapperIndex = msgIndex - currentStartIdx;
    const wrappers = this.chatContainer.querySelectorAll(".cola-msg-wrapper");
    if (wrappers[wrapperIndex]) {
      const target = wrappers[wrapperIndex] as HTMLElement;
      target.addClass("cola-search-active");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  private ensureMessageRendered(msgIndex: number): void {
    const renderedStartIdx = this.messages.length - this.renderedCount;
    if (msgIndex >= renderedStartIdx) return; // Already rendered

    // Load messages from msgIndex to current start
    const newStart = Math.max(0, msgIndex - 10); // A few extra for context
    const fragment = document.createDocumentFragment();
    const tempContainer = document.createElement("div");
    for (let i = newStart; i < renderedStartIdx; i++) {
      this.renderMessageToContainer(tempContainer, this.messages[i].role, this.messages[i].content, this.messages[i].timestamp);
    }
    while (tempContainer.firstChild) {
      fragment.appendChild(tempContainer.firstChild);
    }
    this.chatContainer.insertBefore(fragment, this.chatContainer.firstChild);
    this.renderedCount += (renderedStartIdx - newStart);

  }

  private clearSearchHighlights(): void {
    this.chatContainer.querySelectorAll(".cola-search-active").forEach(el => {
      el.removeClass("cola-search-active");
    });
  }
}
