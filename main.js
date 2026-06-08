var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ColaPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/ColaView.ts
var import_obsidian = require("obsidian");

// src/icons.ts
var ICON_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`;
var ICON_COPY = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
var ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
var ICON_INSERT = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`;
var ICON_PAPERCLIP = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;
var ICON_FILE = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;
var ICON_STOP = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;

// src/ColaView.ts
var VIEW_TYPE_COLA = "cola-chat-view";
var ColaView = class extends import_obsidian.ItemView {
  plugin;
  messages = [];
  chatContainer;
  inputEl;
  statusEl;
  fileInfoEl;
  sendBtn;
  contextToggle;
  contextEnabled = true;
  isLoading = false;
  quoteEl;
  quotedText = null;
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_COLA;
  }
  getDisplayText() {
    return "Cola";
  }
  getIcon() {
    return "message-circle";
  }
  async onOpen() {
    const container = this.contentEl;
    container.empty();
    container.addClass("cola-chat-root");
    const header = container.createEl("div", { cls: "cola-header" });
    const headerLeft = header.createEl("div", { cls: "cola-header-left" });
    headerLeft.createEl("span", { text: "Cola", cls: "cola-header-title" });
    this.statusEl = headerLeft.createEl("span", { cls: "cola-status" });
    this.updateStatus(this.plugin.gateway.isConnected);
    const fileBar = container.createEl("div", { cls: "cola-file-bar" });
    this.fileInfoEl = fileBar.createEl("span", { cls: "cola-file-info" });
    this.contextToggle = fileBar.createEl("span", {
      cls: "cola-context-toggle cola-context-on",
      attr: { title: "\u70B9\u51FB\u5207\u6362\uFF1A\u662F\u5426\u9644\u5E26\u5F53\u524D\u6587\u4EF6\u5185\u5BB9" }
    });
    this.contextToggle.innerHTML = `${ICON_PAPERCLIP} <span class="cola-context-label">\u9644\u5E26\u6587\u4EF6</span>`;
    this.contextToggle.addEventListener("click", () => {
      this.contextEnabled = !this.contextEnabled;
      const label = this.contextToggle.querySelector(".cola-context-label");
      if (label) label.textContent = this.contextEnabled ? "\u9644\u5E26\u6587\u4EF6" : "\u4E0D\u9644\u5E26";
      this.contextToggle.toggleClass("cola-context-on", this.contextEnabled);
      this.contextToggle.toggleClass("cola-context-off", !this.contextEnabled);
    });
    this.updateFileInfo();
    this.chatContainer = container.createEl("div", { cls: "cola-messages" });
    const inputArea = container.createEl("div", { cls: "cola-input-area" });
    this.quoteEl = inputArea.createEl("div", { cls: "cola-quote-block cola-hidden" });
    const inputWrapper = inputArea.createEl("div", { cls: "cola-input-wrapper" });
    this.inputEl = inputWrapper.createEl("textarea", {
      attr: { placeholder: "\u8F93\u5165\u6D88\u606F...", rows: "1" },
      cls: "cola-input"
    });
    this.sendBtn = inputWrapper.createEl("button", {
      cls: "cola-send-btn cola-send-btn-inactive"
    });
    this.sendBtn.innerHTML = ICON_SEND;
    this.inputEl.addEventListener("input", () => {
      this.inputEl.style.height = "auto";
      const newHeight = Math.min(this.inputEl.scrollHeight, 120);
      this.inputEl.style.height = newHeight + "px";
      this.updateSendBtnState();
    });
    this.sendBtn.addEventListener("click", () => {
      if (this.isLoading) return;
      this.handleSend();
    });
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      const shortcut = this.plugin.settings.sendShortcut;
      if (shortcut === "ctrl+enter") {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          this.handleSend();
        }
      } else {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      }
    });
    this.registerEvent(
      this.app.workspace.on("file-open", () => this.updateFileInfo())
    );
    this.plugin.gateway.onMessage((text, actions) => {
      this.addMessage("assistant", text);
      this.setLoading(false);
      if (actions && actions.length > 0) {
        for (const action of actions) {
          this.plugin.executeAction(action);
        }
      }
    });
    this.plugin.gateway.onStatus((connected, message) => {
      this.updateStatus(connected, message);
    });
    this.loadMessages();
  }
  async onClose() {
    this.saveMessages();
  }
  clearChat() {
    this.messages = [];
    this.chatContainer.empty();
    this.saveMessages();
  }
  /** Send text directly as a message (from selection command) */
  sendText(text) {
    if (this.isLoading) {
      this.fillInput(text);
      return;
    }
    const context = this.contextEnabled ? null : null;
    const sent = this.plugin.gateway.send(text, null);
    if (!sent) return;
    this.addMessage("user", text);
    this.setLoading(true);
  }
  /** Fill input box with text (user can edit before sending) */
  fillInput(text) {
    this.inputEl.value = text;
    this.inputEl.style.height = "auto";
    const newHeight = Math.min(this.inputEl.scrollHeight, 120);
    this.inputEl.style.height = newHeight + "px";
    this.inputEl.focus();
    this.updateSendBtnState();
  }
  /** Show selected text as a quote reference above input */
  quoteSelection(text) {
    this.quotedText = text;
    this.quoteEl.empty();
    const quoteContent = this.quoteEl.createEl("div", { cls: "cola-quote-content" });
    quoteContent.setText(text);
    const dismissBtn = this.quoteEl.createEl("span", { cls: "cola-quote-dismiss", text: "\xD7" });
    dismissBtn.addEventListener("click", () => this.clearQuote());
    this.quoteEl.removeClass("cola-hidden");
    this.inputEl.focus();
    this.inputEl.setAttribute("placeholder", "\u9488\u5BF9\u5F15\u7528\u5185\u5BB9\u63D0\u95EE...");
    this.updateSendBtnState();
  }
  clearQuote() {
    this.quotedText = null;
    this.quoteEl.addClass("cola-hidden");
    this.quoteEl.empty();
    this.inputEl.setAttribute("placeholder", "\u8F93\u5165\u6D88\u606F...");
  }
  async handleSend() {
    const text = this.inputEl.value.trim();
    if (!text && !this.quotedText || this.isLoading) return;
    let messageToSend = text;
    let displayMessage = text;
    if (this.quotedText) {
      const quoted = this.quotedText;
      messageToSend = `> ${quoted.replace(/\n/g, "\n> ")}

${text}`;
      displayMessage = messageToSend;
      this.clearQuote();
    }
    if (!messageToSend.trim()) return;
    const context = this.contextEnabled ? await this.getFileContext() : null;
    const sent = this.plugin.gateway.send(messageToSend, context);
    if (!sent) return;
    this.inputEl.value = "";
    this.inputEl.style.height = "auto";
    this.addMessage("user", displayMessage);
    this.setLoading(true);
  }
  async getFileContext() {
    const file = this.app.workspace.getActiveFile();
    if (!file) return null;
    try {
      const content = await this.app.vault.cachedRead(file);
      return { filePath: file.path, fileName: file.basename, content: content.slice(0, 1e4) };
    } catch {
      return null;
    }
  }
  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: Date.now() });
    this.renderMessage(role, content);
    this.saveMessages();
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  renderMessage(role, content) {
    const msgWrapper = this.chatContainer.createEl("div", {
      cls: `cola-msg-wrapper cola-msg-wrapper-${role}`
    });
    const msgEl = msgWrapper.createEl("div", {
      cls: `cola-msg cola-msg-${role}`
    });
    const contentEl = msgEl.createEl("div", { cls: "cola-msg-content" });
    if (role === "assistant") {
      import_obsidian.MarkdownRenderer.render(this.app, content, contentEl, "", this);
      const codeBlocks = contentEl.querySelectorAll("pre > code");
      codeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        if (!pre) return;
        pre.addClass("cola-code-block");
        const copyBtn = pre.createEl("button", { cls: "cola-code-copy-btn" });
        copyBtn.innerHTML = ICON_COPY;
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(codeEl.textContent || "");
          copyBtn.innerHTML = ICON_CHECK;
          setTimeout(() => {
            copyBtn.innerHTML = ICON_COPY;
          }, 1500);
        });
      });
    } else {
      contentEl.setText(content);
    }
    const msgActions = msgWrapper.createEl("div", { cls: "cola-msg-actions" });
    const copyMsgBtn = msgActions.createEl("button", {
      cls: "cola-msg-action-btn",
      attr: { title: "\u590D\u5236" }
    });
    copyMsgBtn.innerHTML = ICON_COPY;
    copyMsgBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content);
      copyMsgBtn.innerHTML = ICON_CHECK;
      setTimeout(() => {
        copyMsgBtn.innerHTML = ICON_COPY;
      }, 1500);
    });
    if (role === "assistant") {
      const insertBtn = msgActions.createEl("button", {
        cls: "cola-msg-action-btn",
        attr: { title: "\u63D2\u5165\u5230\u7F16\u8F91\u5668" }
      });
      insertBtn.innerHTML = ICON_INSERT;
      insertBtn.addEventListener("click", () => {
        this.plugin.insertAtCursor(content);
        insertBtn.innerHTML = ICON_CHECK;
        setTimeout(() => {
          insertBtn.innerHTML = ICON_INSERT;
        }, 1500);
      });
    }
  }
  setLoading(loading) {
    this.isLoading = loading;
    if (loading) {
      this.sendBtn.innerHTML = ICON_STOP;
      this.sendBtn.addClass("cola-send-btn-loading");
      this.sendBtn.removeClass("cola-send-btn-inactive");
      this.sendBtn.disabled = true;
      const existing = this.chatContainer.querySelector(".cola-typing");
      if (!existing) {
        const typingEl = this.chatContainer.createEl("div", { cls: "cola-typing" });
        typingEl.setText("Cola \u6B63\u5728\u601D\u8003...");
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
      }
    } else {
      this.sendBtn.removeClass("cola-send-btn-loading");
      this.updateSendBtnState();
      const typingEl = this.chatContainer.querySelector(".cola-typing");
      if (typingEl) typingEl.remove();
    }
  }
  updateSendBtnState() {
    if (this.isLoading) return;
    const hasContent = this.inputEl.value.trim().length > 0 || this.quotedText !== null;
    this.sendBtn.innerHTML = ICON_SEND;
    this.sendBtn.disabled = !hasContent;
    this.sendBtn.toggleClass("cola-send-btn-inactive", !hasContent);
    this.sendBtn.toggleClass("cola-send-btn-loading", false);
  }
  updateFileInfo() {
    const file = this.app.workspace.getActiveFile();
    if (file) {
      this.fileInfoEl.innerHTML = `${ICON_FILE} ${file.basename}`;
      this.fileInfoEl.title = file.path;
    } else {
      this.fileInfoEl.setText("\u65E0\u6253\u5F00\u6587\u4EF6");
    }
  }
  updateStatus(connected, message) {
    if (connected) {
      this.statusEl.setText("\u25CF");
      this.statusEl.title = "\u5DF2\u8FDE\u63A5";
    } else {
      this.statusEl.setText("\u25CB");
      this.statusEl.title = message || "\u672A\u8FDE\u63A5";
    }
    this.statusEl.toggleClass("cola-status-connected", connected);
    this.statusEl.toggleClass("cola-status-disconnected", !connected);
  }
  saveMessages() {
    this.plugin.saveData({ messages: this.messages, settings: this.plugin.settings });
  }
  async loadMessages() {
    try {
      const data = await this.plugin.loadData();
      if (data?.messages && Array.isArray(data.messages)) {
        this.messages = data.messages;
        for (const msg of this.messages) {
          this.renderMessage(msg.role, msg.content);
        }
        setTimeout(() => {
          this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 50);
      }
    } catch {
    }
  }
};

// src/ColaGateway.ts
var import_fs = require("fs");
var import_path = require("path");
var import_os = require("os");
var import_obsidian2 = require("obsidian");
var TOKEN_PATH = (0, import_path.join)((0, import_os.homedir)(), ".cola", "plugins", "obsidian", "local-token");
var DEFAULT_PORT = 19533;
var ColaGateway = class {
  constructor(plugin) {
    this.plugin = plugin;
  }
  ws = null;
  messageHandler = null;
  statusHandler = null;
  connectedHandler = null;
  reconnectTimer = null;
  port = DEFAULT_PORT;
  intentionalClose = false;
  reconnectAttempts = 0;
  get isConnected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  connect() {
    this.intentionalClose = false;
    try {
      const token = this.readToken();
      if (!token) {
        this.notifyStatus(false, "\u627E\u4E0D\u5230\u8FDE\u63A5\u51ED\u8BC1");
        return;
      }
      const url = `ws://127.0.0.1:${this.port}?token=${token}`;
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        console.log("[Cola] Connected to Cola");
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (data.type === "connected") {
            console.log("[Cola] Authenticated, connId:", data.connId);
            if (this.connectedHandler) this.connectedHandler();
            return;
          }
          if (data.type === "reply" && this.messageHandler) {
            this.messageHandler(data.text, data.actions);
          }
        } catch (e) {
          console.error("[Cola] Failed to parse message:", e);
        }
      };
      this.ws.onclose = (event) => {
        this.ws = null;
        if (!this.intentionalClose) {
          const reason = event.code === 4001 ? "\u8BA4\u8BC1\u5931\u8D25\uFF0C\u6B63\u5728\u91CD\u8BD5..." : "\u8FDE\u63A5\u65AD\u5F00\uFF0C\u6B63\u5728\u91CD\u8FDE...";
          this.notifyStatus(false, reason);
          console.log("[Cola] Disconnected, will retry...");
          this.scheduleReconnect();
        } else {
          this.notifyStatus(false);
        }
      };
      this.ws.onerror = () => {
      };
    } catch (e) {
      console.error("[Cola] Failed to connect:", e);
      this.notifyStatus(false, "\u8FDE\u63A5\u5931\u8D25");
      this.scheduleReconnect();
    }
  }
  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
  }
  send(text, context) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      new import_obsidian2.Notice("Cola \u672A\u8FDE\u63A5\uFF0C\u8BF7\u786E\u8BA4 Cola \u5DF2\u542F\u52A8");
      return false;
    }
    this.ws.send(
      JSON.stringify({
        type: "message",
        text,
        context
      })
    );
    return true;
  }
  onMessage(handler) {
    this.messageHandler = handler;
  }
  onStatus(handler) {
    this.statusHandler = handler;
  }
  onConnected(handler) {
    this.connectedHandler = handler;
  }
  /** Send vault file list to Cola after connection */
  sendVaultInfo(vaultName, files) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: "vault-info",
      text: "",
      vaultName,
      vaultFiles: files
    }));
  }
  notifyStatus(connected, message) {
    if (this.statusHandler) {
      this.statusHandler(connected, message);
    }
  }
  readToken() {
    try {
      return (0, import_fs.readFileSync)(TOKEN_PATH, "utf-8").trim();
    } catch {
      console.warn("[Cola] Cannot read token file:", TOKEN_PATH);
      return null;
    }
  }
  scheduleReconnect() {
    if (this.reconnectTimer || this.intentionalClose) return;
    this.reconnectAttempts++;
    const delay = Math.min(3e3 * Math.pow(2, this.reconnectAttempts - 1), 3e4);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  sendShortcut: "ctrl+enter"
};
var ColaPlugin = class extends import_obsidian3.Plugin {
  gateway;
  settings;
  async onload() {
    await this.loadSettings();
    this.gateway = new ColaGateway(this);
    this.registerView(VIEW_TYPE_COLA, (leaf) => new ColaView(leaf, this));
    this.addRibbonIcon("message-circle", "Open Cola", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-cola-chat",
      name: "\u6253\u5F00 Cola \u5BF9\u8BDD",
      callback: () => this.activateView()
    });
    this.addCommand({
      id: "quote-selection-to-cola",
      name: "\u5F15\u7528\u9009\u4E2D\u6587\u672C\u5230 Cola",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new import_obsidian3.Notice("\u6CA1\u6709\u9009\u4E2D\u6587\u672C");
          return;
        }
        this.quoteSelectionToCola(selection);
      }
    });
    this.addCommand({
      id: "send-selection-to-cola",
      name: "\u5C06\u9009\u4E2D\u6587\u672C\u76F4\u63A5\u53D1\u9001\u7ED9 Cola",
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new import_obsidian3.Notice("\u6CA1\u6709\u9009\u4E2D\u6587\u672C");
          return;
        }
        this.sendSelectionToCola(selection);
      }
    });
    this.addSettingTab(new ColaSettingTab(this.app, this));
    this.gateway.onConnected(() => {
      this.sendVaultInfo();
    });
    this.gateway.connect();
  }
  async onunload() {
    this.gateway.disconnect();
  }
  async activateView() {
    const { workspace } = this.app;
    let leaves = workspace.getLeavesOfType(VIEW_TYPE_COLA);
    if (leaves.length === 0) {
      const leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: VIEW_TYPE_COLA, active: true });
        workspace.revealLeaf(leaf);
        leaves = workspace.getLeavesOfType(VIEW_TYPE_COLA);
      }
    } else {
      workspace.revealLeaf(leaves[0]);
    }
    if (leaves.length > 0 && leaves[0].view instanceof ColaView) {
      return leaves[0].view;
    }
    return null;
  }
  /** Quote selection in Cola sidebar (user adds question below) */
  async quoteSelectionToCola(text) {
    const view = await this.activateView();
    if (view) {
      view.quoteSelection(text);
    }
  }
  /** Send selection directly to Cola as a message */
  async sendSelectionToCola(text) {
    const view = await this.activateView();
    if (view) {
      view.sendText(text);
    }
  }
  /** Insert text at cursor in the most recent markdown editor */
  insertAtCursor(text) {
    let mdView = null;
    mdView = this.app.workspace.getActiveViewOfType(import_obsidian3.MarkdownView);
    if (!mdView) {
      const leaves = this.app.workspace.getLeavesOfType("markdown");
      if (leaves.length > 0) {
        const leaf = leaves[leaves.length - 1];
        if (leaf.view instanceof import_obsidian3.MarkdownView) {
          mdView = leaf.view;
        }
      }
    }
    if (!mdView) {
      new import_obsidian3.Notice("\u6CA1\u6709\u6253\u5F00\u7684\u7F16\u8F91\u5668\uFF0C\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A Markdown \u6587\u4EF6");
      return;
    }
    const editor = mdView.editor;
    const cursor = editor.getCursor();
    editor.replaceRange(text, cursor);
    const lines = text.split("\n");
    const lastLine = lines[lines.length - 1];
    if (lines.length === 1) {
      editor.setCursor({ line: cursor.line, ch: cursor.ch + lastLine.length });
    } else {
      editor.setCursor({ line: cursor.line + lines.length - 1, ch: lastLine.length });
    }
    this.app.workspace.revealLeaf(mdView.leaf);
    new import_obsidian3.Notice("\u5DF2\u63D2\u5165");
  }
  /** Send vault file structure to Cola */
  sendVaultInfo() {
    const files = [];
    const walkFolder = (folder) => {
      for (const child of folder.children) {
        if (child instanceof import_obsidian3.TFile && child.extension === "md") {
          files.push(child.path);
        } else if (child instanceof import_obsidian3.TFolder) {
          walkFolder(child);
        }
      }
    };
    walkFolder(this.app.vault.getRoot());
    const limited = files.slice(0, 500);
    const vaultName = this.app.vault.getName();
    this.gateway.sendVaultInfo(vaultName, limited);
  }
  /** Execute a Cola action on the vault */
  async executeAction(action) {
    switch (action.type) {
      case "openFile": {
        if (!action.path) return;
        const file = this.app.vault.getAbstractFileByPath(action.path);
        if (file instanceof import_obsidian3.TFile) {
          const leaf = this.app.workspace.getLeaf();
          await leaf.openFile(file);
          this.app.workspace.revealLeaf(leaf);
        } else {
          const allFiles = this.app.vault.getFiles();
          const match = allFiles.find(
            (f) => f.path.toLowerCase().includes(action.path.toLowerCase()) || f.basename.toLowerCase().includes(action.path.toLowerCase())
          );
          if (match) {
            const leaf = this.app.workspace.getLeaf();
            await leaf.openFile(match);
            this.app.workspace.revealLeaf(leaf);
          } else {
            new import_obsidian3.Notice(`\u627E\u4E0D\u5230\u6587\u4EF6: ${action.path}`);
          }
        }
        break;
      }
      case "createFile": {
        if (!action.path) return;
        const content = action.content || "";
        try {
          const newFile = await this.app.vault.create(action.path, content);
          const leaf = this.app.workspace.getLeaf();
          await leaf.openFile(newFile);
          this.app.workspace.revealLeaf(leaf);
          new import_obsidian3.Notice(`\u5DF2\u521B\u5EFA: ${action.path}`);
        } catch (e) {
          new import_obsidian3.Notice(`\u521B\u5EFA\u6587\u4EF6\u5931\u8D25: ${action.path}`);
        }
        break;
      }
      case "searchFile": {
        if (!action.query) return;
        const allFiles = this.app.vault.getFiles();
        const query = action.query.toLowerCase();
        const results = allFiles.filter(
          (f) => f.path.toLowerCase().includes(query) || f.basename.toLowerCase().includes(query)
        ).slice(0, 5);
        if (results.length === 1) {
          const leaf = this.app.workspace.getLeaf();
          await leaf.openFile(results[0]);
          this.app.workspace.revealLeaf(leaf);
        } else if (results.length > 1) {
          new import_obsidian3.Notice(`\u627E\u5230 ${results.length} \u4E2A\u6587\u4EF6: ${results.map((f) => f.basename).join(", ")}`);
        } else {
          new import_obsidian3.Notice(`\u6CA1\u6709\u627E\u5230\u5339\u914D\u7684\u6587\u4EF6: ${action.query}`);
        }
        break;
      }
    }
  }
  async clearChatHistory() {
    const data = await this.loadData();
    await this.saveData({ ...data, messages: [] });
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_COLA);
    for (const leaf of leaves) {
      if (leaf.view instanceof ColaView) {
        leaf.view.clearChat();
      }
    }
    new import_obsidian3.Notice("\u804A\u5929\u8BB0\u5F55\u5DF2\u6E05\u9664\uFF08Cola \u7684\u8BB0\u5FC6\u4E0D\u53D7\u5F71\u54CD\uFF09");
  }
  async loadSettings() {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings || {});
  }
  async saveSettings() {
    const data = await this.loadData() || {};
    data.settings = this.settings;
    await this.saveData(data);
  }
};
var ColaSettingTab = class extends import_obsidian3.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Cola \u63D2\u4EF6\u8BBE\u7F6E" });
    new import_obsidian3.Setting(containerEl).setName("\u53D1\u9001\u5FEB\u6377\u952E").setDesc("\u9009\u62E9\u53D1\u9001\u6D88\u606F\u7684\u5FEB\u6377\u952E\u65B9\u5F0F").addDropdown(
      (dropdown) => dropdown.addOption("ctrl+enter", "Ctrl/Cmd + Enter").addOption("enter", "Enter\uFF08Shift+Enter \u6362\u884C\uFF09").setValue(this.plugin.settings.sendShortcut).onChange(async (value) => {
        this.plugin.settings.sendShortcut = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "\u5FEB\u6377\u952E" });
    containerEl.createEl("p", {
      text: '\u6240\u6709\u5FEB\u6377\u952E\u5747\u53EF\u5728 Obsidian \u8BBE\u7F6E \u2192 \u5FEB\u6377\u952E \u4E2D\u641C\u7D22 "Cola" \u8FDB\u884C\u81EA\u5B9A\u4E49\u3002',
      cls: "setting-item-description"
    });
    const hotkeyList = containerEl.createEl("div", { cls: "cola-hotkey-list" });
    const commands = [
      { name: "\u6253\u5F00 Cola \u5BF9\u8BDD", id: "open-cola-chat" },
      { name: "\u5F15\u7528\u9009\u4E2D\u6587\u672C\u5230 Cola", id: "quote-selection-to-cola" },
      { name: "\u5C06\u9009\u4E2D\u6587\u672C\u76F4\u63A5\u53D1\u9001\u7ED9 Cola", id: "send-selection-to-cola" }
    ];
    for (const cmd of commands) {
      const item = hotkeyList.createEl("div", { cls: "cola-hotkey-item" });
      item.createEl("span", { text: cmd.name, cls: "cola-hotkey-name" });
      item.createEl("span", { text: `obsidian-cola:${cmd.id}`, cls: "cola-hotkey-id" });
    }
    containerEl.createEl("h3", { text: "\u6570\u636E" });
    new import_obsidian3.Setting(containerEl).setName("\u6E05\u9664\u804A\u5929\u8BB0\u5F55").setDesc("\u4EC5\u6E05\u9664 Obsidian \u4FA7\u8FB9\u680F\u4E2D\u7684\u5BF9\u8BDD\u8BB0\u5F55\u3002Cola \u7684\u8BB0\u5FC6\u548C\u4E0A\u4E0B\u6587\u4E0D\u4F1A\u53D7\u5230\u5F71\u54CD\u3002").addButton(
      (btn) => btn.setButtonText("\u6E05\u9664").setWarning().onClick(async () => {
        await this.plugin.clearChatHistory();
      })
    );
    new import_obsidian3.Setting(containerEl).setName("\u8FDE\u63A5\u72B6\u6001").setDesc(
      this.plugin.gateway.isConnected ? "\u2705 \u5DF2\u8FDE\u63A5\u5230 Cola" : "\u274C \u672A\u8FDE\u63A5\u3002\u8BF7\u786E\u8BA4 Cola \u5DF2\u542F\u52A8\u3002"
    );
  }
};
