import {
  JupyterFrontEnd
} from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel
} from '@jupyterlab/notebook';

import {
  UUID,
} from '@lumino/coreutils';

import {
  Panel,
  Widget,
  // BoxPanel,
  // BoxLayout,
  Layout,
  LayoutItem, 
  PanelLayout
} from '@lumino/widgets';

import {
  IDisposable, DisposableDelegate
} from '@lumino/disposable';

import {
  ToolbarButton
} from '@jupyterlab/apputils';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeCell, Cell
} from '@jupyterlab/cells';

import {
  saveIcon
} from '@jupyterlab/ui-components';

import {
  ArrayExt, toArray, IIterator, map
} from '@lumino/algorithm';

import {
  Message
} from '@lumino/messaging';

import {
  MimeData
} from '@lumino/coreutils';

import 
{ IDragEvent,
 } from '@lumino/dragdrop';

 import {
  MessageLoop
} from '@lumino/messaging';

import {
  MainAreaWidget,
  WidgetTracker,
} from '@jupyterlab/apputils';

import {
  Icons
} from './icons';

// import {ServerCoonection} from '@jupyterlab/services';

const DRAG_THRESHOLD = 5;

// For unimplemented server component
// import { requestAPI } from './jupyterlabvoilaext';

// HTML element classes

const RENAME_DIALOG_CLASS = 'pr-RenameDialog';

const RENAME_TITLE_CLASS = 'pr-RenameTitle';

const DASHBOARD_CLASS = 'pr-JupyterDashboard';

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

const DASHBOARD_AREA_CLASS = 'pr-DashboardArea';

const DROP_TARGET_CLASS = 'pr-DropTarget';

const DROP_TOP_CLASS = 'pr-DropTop';

const DROP_BOTTOM_CLASS = 'pr-DropBottom';

/**
 * Class to wrap dashboard commands with undo/redo functionality.
 * CURRENTLY UNUSED
 */
class DashboardCommand {
  constructor(options: DashboardCommand.IOptions) {
    this._dashboard = options.dashboard;
    this._widget = options.widget;
    this._execute = options.execute;
    this._undo = options.undo;
    this._redo = options.redo;
  }

  execute(): void {
    this._execute({
      dashboard: this._dashboard,
      widget: this._widget,
    });
  }

  undo(): void {
    this._undo({
      dashboard: this._dashboard,
      widget: this._widget,
    });
  }

  redo(): void {
    this._redo({
      dashboard: this._dashboard,
      widget: this._widget,
    });
  }

  private _execute: DashboardFunction;
  private _undo: OptionalDashboardFunction;
  private _redo: OptionalDashboardFunction;
  private _dashboard: Dashboard | undefined; 
  private _widget: DashboardWidget | undefined;
}


/**
 * A namespace for private functionality.
 */
namespace Private {
  // export function findCellOuput(mime: MimeData): string | undefined{
  //   let target = event.target as HTMLElement;
  //   const cellFilter = (node: HTMLElement) =>
  //     node.classList.contains(CONSOLE_CELL_CLASS);
  //   let cellIndex = CellDragUtils.findCell(target, this._cells, cellFilter);


  //   // Create a DashboardWidget around the selected cell.
  //   const content = new DashboardWidget({
  //     notebook: current,
  //     cell,
  //     index
  //   });
  //   return 
  // }
  

  /**
   * Given a MimeData instance, extract the first text data, if any.
   */
  export function findTextData(mime: MimeData): string | undefined {
    const types = mime.types();
    const textType = types.find(t => t.indexOf('text') === 0);
    if (textType === undefined) {
      return "undefined" as string;
    }
    
    return mime.getData(textType) as string;
  }
}


/**
 * Layout for DashboardArea widget.
 */
class DashboardLayout extends PanelLayout {
  /**
   * Construct a new dashboard layout.
   *
   * @param options - The options for initializing the layout.
   */
  constructor(options: DashboardLayout.IOptions = {}) {
    super(options);
    // if (options.rowCount !== undefined) {
    //   Private.reallocSizers(this._rowSizers, options.rowCount);
    // }
    // if (options.columnCount !== undefined) {
    //   Private.reallocSizers(this._columnSizers, options.columnCount);
    // }
    // if (options.rowSpacing !== undefined) {
    //   this._rowSpacing = Private.clampValue(options.rowSpacing);
    // }
    // if (options.columnSpacing !== undefined) {
    //   this._columnSpacing = Private.clampValue(options.columnSpacing);
    // }
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param widget - The widget to attach to the parent.
   */
  protected attachWidget(index: number, widget: Widget): void {
    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's node to the parent.
    this.parent!.node.appendChild(widget.node);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Add a widget to Dashboard layout.
   *
   * @param widget - The widget to add to the layout.
   *
   */
  addWidget(widget: DashboardWidget): void {

    // Add the widget to the layout.
    let item = new LayoutItem(widget);
    this._items.push(item);

    // Attach the widget to the parent.
    if (this.parent) {
      this.attachWidget(-1, widget);
      let pos = ((widget.cell as Cell).model.metadata.get("pos")) as string[];
      this._update(pos, item);
    }
  }

  /**
   * Create an iterator over the widgets in the layout.
   *
   * @returns A new iterator over the widgets in the layout.
   */
  iter(): IIterator<Widget> {
    return map(this._items, item => item.widget);
  }

  private _update(pos: string[], item: LayoutItem){
    if(pos == undefined){

    }else{
      item.update(Number(pos[0]), Number(pos[1]), Number(pos[2]), Number(pos[3])); 
    }
  }

  /**
   * Insert a widget at a specified position in the list view.
   * Near-synonym for the protected insertWidget method.
   * Adds widget to the last possible posiiton if index is set to -1.
   */
  placeWidget(index: number, widget: DashboardWidget): void {
    if (index === -1) {
      this.addWidget(widget);
    } else {
      this.addWidget(widget);
      // this.insertWidget(index, widget);
    }
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param widget - The widget to detach from the parent.
   */
  protected detachWidget(index: number, widget: Widget): void {
    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's node from the parent.
    this.parent!.node.removeChild(widget.node);

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Remove a widget from Dashboard layout.
   *
   * @param widget - The widget to remove from the layout.
   *
   */
  removeWidget(widget: Widget): void {
    // Look up the index for the widget.
    let i = ArrayExt.findFirstIndex(this._items, it => it.widget === widget);

    // Bail if the widget is not in the layout.
    if (i === -1) {
      return;
    }

    // Remove the widget from the layout.
    let item = ArrayExt.removeAt(this._items, i)!;

    // Detach the widget from the parent.
    if (this.parent) {
      this.detachWidget(-1, widget);
    }

    // Dispose the layout item.
    item.dispose();
  }

  // private _dirty = false;
  // private _rowSpacing = 4;
  // private _columnSpacing = 4;
  private _items: LayoutItem[] = [];
  // private _rowStarts: number[] = [];
  // private _columnStarts: number[] = [];
  // private _rowSizers: BoxSizer[] = [new BoxSizer()];
  // private _columnSizers: BoxSizer[] = [new BoxSizer()];
  // private _box: ElementExt.IBoxSizing | null = null;
}


/**
 * Main content widget for the Dashboard widget.
 */
class DashboardArea extends Panel {
  constructor(options: DashboardArea.IOptions) {
    super({...options, layout: new DashboardLayout()});
    this._outputTracker = options.outputTracker;
    this.addClass(DASHBOARD_AREA_CLASS);
  }

  placeWidget(index: number, widget: DashboardWidget): void {
    (this.layout as DashboardLayout).placeWidget(index, widget);
    this._outputTracker.add(widget);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('lm-dragenter', this);
    this.node.addEventListener('lm-dragleave', this);
    this.node.addEventListener('lm-dragover', this);
    this.node.addEventListener('lm-drop', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('lm-dragenter', this);
    this.node.removeEventListener('lm-dragleave', this);
    this.node.removeEventListener('lm-dragover', this);
    this.node.removeEventListener('lm-drop', this);
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.addClass('pr-DropTarget');
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    this.removeClass(DROP_TARGET_CLASS);
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    this.removeClass(DROP_TARGET_CLASS);
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'copy';
    this.addClass(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();

    const notebook = event.source.parent as NotebookPanel;
    // const activeCell = notebook.content.activeCell;
    const cell = notebook.content.activeCell as CodeCell;
    const index = notebook.content.activeCellIndex;

    const widget = new DashboardWidget({
      notebook,
      cell,
      index
    });
    
    // FIXME:
    // Doesn't do the disposing on notebook close that the insertWidget function in addCommands does.
    this.placeWidget(0, widget);
    this.update();

    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
  }

  handleEvent(event: Event): void {
    switch(event.type) {
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
    }
  }

  private _outputTracker: WidgetTracker<DashboardWidget>;
}


/**
 * Main Dashboard display widget. Currently extends MainAreaWidget (May change)
 */
class Dashboard extends MainAreaWidget<Widget> {
  // Generics??? Would love to further constrain this to DashboardWidgets but idk how
  constructor(options: Dashboard.IOptions) {
    const dashboardArea = new DashboardArea({outputTracker: options.outputTracker, layout: new DashboardLayout({}) })
    super({...options, content: options.content !== undefined ? options.content : dashboardArea });
    this._name = options.name || 'Unnamed Dashboard';
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = Icons.blueDashboard;
    // Add caption?

    this._undoStack = [];
    this._redoStack = [];
    this._maxStackSize = options.maxStackSize !== undefined ? options.maxStackSize : Dashboard.DEFAULT_MAX_STACK_SIZE;
    
    this.addClass(DASHBOARD_CLASS);
    this.node.setAttribute('style', 'overflow:auto');

    // Add save button to toolbar
    this.toolbar.addItem("save", ToolbarItems.createSaveButton(this, options.panel));
  }

  /**
   * Adds a DashboardWidget to a specific position on the dashboard.
   * Inserting at index -1 places the widget at the end of the dashboard.
   */
  insertWidget(index: number, widget: DashboardWidget): void {
    (this.content as DashboardArea).placeWidget(index, widget)
  }

  rename(newName: string): void {
    // Have to call .update() after to see changes. Include update in function?
    this._name = newName;
    this.title.label = newName;
  }

  // Executes a DashboardCommand and adds it to the undo stack.
  // CURRENTLY UNUSED
  runCommand(command: DashboardCommand): void {
    this._redoStack = [];
    command.execute();
    this._undoStack.push(command);
  }

  // Undoes the last executed DashboardCommand.
  // CURRENTLY UNUSED
  undo(): void {
    if (!this._undoStack.length) {
      return;
    }
    const command = this._undoStack.pop();
    command.undo();
    if (this._redoStack.length >= this._maxStackSize) {
      void this._redoStack.shift();
    }
    this._redoStack.push(command);
  }

  // Redoes the last undone DasboardCommand.
  // CURRENTLY UNUSED
  redo(): void {
    if (!this._redoStack.length) {
      return;
    }
    const command = this._redoStack.pop();
    command.redo();
    if (this._undoStack.length >= this._maxStackSize) {
      void this.undoStack.shift();
    }
    this._undoStack.push(command);
  }

  get undoStack(): Array<DashboardCommand> {
    return this._undoStack;
  }

  get redoStack(): Array<DashboardCommand> {
    return this._redoStack;
  }

  private _undoStack: Array<DashboardCommand>;
  private _redoStack: Array<DashboardCommand>;
  private _maxStackSize: number;
  private _name: string;
}

/**
 * Widget to wrap delete/move/etc functionality of widgets in a dashboard (future). 
 * Currently just a slight modification of ClonedOutpuArea. 
 * jupyterlab/packages/notebook-extension/src/index.ts
 */
class DashboardWidget extends Panel {

  constructor(options: DashboardWidget.IOptions) {
    super();
    this._notebook = options.notebook;
    this._index = options.index !== undefined ? options.index : -1;
    this._cell = options.cell || null;
    this.id = `DashboardWidget-${UUID.uuid4()}`;
    this.addClass(DASHBOARD_WIDGET_CLASS);
    // Makes widget focusable for WidgetTracker
    this.node.setAttribute('tabindex', '-1');
    // Make widget draggable
    this.node.setAttribute('draggable', 'true');

    // Wait for the notebook to be loaded before cloning the output area.
    void this._notebook.context.ready.then(() => {
      if (!this._cell) {
        this._cell = this._notebook.content.widgets[this._index] as CodeCell;
      }
      if (!this._cell || this._cell.model.type !== 'code') {
        this.dispose();
        return;
      }
      const clone = this._cell.cloneOutputArea();
      this.addWidget(clone);
    });
  }

  /**
   * The index of the cell in the notebook.
   */
  get cell(): CodeCell {
    return this._cell;
  }

  /**
   * The index of the cell in the notebook.
   */
  get index(): number {
    return this._cell
      ? ArrayExt.findFirstIndex(
          this._notebook.content.widgets,
          c => c === this._cell
        )
      : this._index;
  }

  /**
   * The path of the notebook for the cloned output area.
   */
  get path(): string {
    return this._notebook.context.path;
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
    this.node.addEventListener('contextmenu', this);
    this.node.addEventListener('lm-dragenter', this);
    this.node.addEventListener('lm-dragleave', this);
    this.node.addEventListener('lm-dragover', this);
    this.node.addEventListener('lm-drop', this);
    this.node.addEventListener('mousedown', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('contextmenu', this);
    this.node.removeEventListener('lm-dragenter', this);
    this.node.removeEventListener('lm-dragleave', this);
    this.node.removeEventListener('lm-dragover', this);
    this.node.removeEventListener('lm-drop', this);
    this.node.removeEventListener('mousedown', this);
  }

  handleEvent(event: Event): void {
    switch(event.type) {
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseUp(event as MouseEvent);
        break;
      case 'mousemove':
        this._evtMouseMove(event as MouseEvent);
        break;
      case 'click':
      case 'contextmenu':
        // Focuses on clicked output and blurs all others
        // Is there a more efficient way to blur other outputs?
        Array.from(document.getElementsByClassName(DASHBOARD_WIDGET_CLASS))
             .map(blur);
        this.node.focus();
    }
  }

  private _evtDragEnter(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
  }

  private _evtDragLeave(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.removeClass(DROP_BOTTOM_CLASS);
    this.removeClass(DROP_TOP_CLASS);
  }

  private _evtDragOver(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    event.dropAction = 'copy';
    if (event.offsetY > this.node.offsetHeight / 2) {
      this.removeClass(DROP_TOP_CLASS);
      this.addClass(DROP_BOTTOM_CLASS);
    } else {
      this.removeClass(DROP_BOTTOM_CLASS);
      this.addClass(DROP_TOP_CLASS);
    }
  }

  private _evtDrop(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();

    // Get the index of this widget in its parent's array.
    let insertIndex = toArray(this.parent.children()).indexOf(this);

    // Something went wrong.
    if (insertIndex === -1) {
      return;
    }

    // Modify the insert index depending on if the drop area is closer to the
    // bottom of this widget.
    if (this.hasClass(DROP_TOP_CLASS)) {
      this.removeClass(DROP_TOP_CLASS);
    } else {
      this.removeClass(DROP_BOTTOM_CLASS);
      insertIndex++;
    }

    const notebook = event.source.parent as NotebookPanel;
    const cell = notebook.content.activeCell as CodeCell;
    const index = notebook.content.activeCellIndex;

    // Create the DashboardWidget.
    const widget = new DashboardWidget({
      notebook,
      cell,
      index
    });

    // Insert the new DashboardWidget next to this widget.
    (this.parent as DashboardArea).placeWidget(insertIndex, widget);
    this.parent.update();
  }

  private _evtMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mousemove', this);
    this._pressX = event.clientX;
    this._pressY = event.clientY;
  }

  private _evtMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('mousemove', this);
  }

  private _evtMouseMove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const dx = Math.abs(event.clientX - this._pressX);
    const dy = Math.abs(event.clientY - this._pressY);

    if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
      this.node.removeEventListener('mouseup', this);
      this.node.removeEventListener('mousemove', this);
      //TODO: Initiate lumino drag!
      console.log('drag started!');
    }
  }

  private _notebook: NotebookPanel;
  private _index: number;
  private _cell: CodeCell | null = null;
  private _pressX: number;
  private _pressY: number;
}

// /**
//  * Create the node for a rename handler.
//  * jupyterlab/packages/docmanager/src/dialog.ts
//  */
// function createRenameNode(): HTMLElement {
//   const body = document.createElement('div');

//   const nameTitle = document.createElement('label');
//   nameTitle.textContent = 'New Name';
//   nameTitle.className = RENAME_TITLE_CLASS;
//   const name = document.createElement('input');

//   body.appendChild(nameTitle);
//   body.appendChild(name);
//   return body;
// }

// /**
//  * Create the node for an insert handler.
//  */
// function createInsertNode(): HTMLElement {
//   const body = document.createElement('div');

//   const nameTitle = document.createElement('label');
//   nameTitle.textContent = 'Index';
//   const index = document.createElement('input');

//   body.appendChild(nameTitle);
//   body.appendChild(index);
//   return body;
// }

/**
 * Namespace for Dashboard options
 */
namespace Dashboard {
  export interface IOptions extends MainAreaWidget.IOptionsOptionalContent {
    /**
     * Dashboard name.
     */
    name?: string;

    /**
     * Maximum size of the undo/redo stack.
     */
    maxStackSize?: number;

    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * NotebookPanel.
     */
    panel: NotebookPanel;
  }

  export const DEFAULT_MAX_STACK_SIZE = 10;
}

/**
 * Namespace for DashboardWidget options
 */
namespace DashboardWidget {
  export interface IOptions {
    /**
     * The notebook associated with the cloned output area.
     */
    notebook: NotebookPanel;

    /**
     * The cell for which to clone the output area.
     */
    cell?: CodeCell;

    /**
     * If the cell is not available, provide the index
     * of the cell for when the notebook is loaded.
     */
    index?: number;
  }
}

/**
 * The namespace for the `DashboardLayout` class statics.
 */
export
namespace DashboardLayout {
  /**
   * An options object for initializing a grid layout.
   */

  /**
  how do I define a dashboard layout, 
  not grid obvoisouly

  eventacully
  will have to keeo track of all the cells(outputs)
  and their absolute positions

  default sizes of "grid"

  right now just use the grid??
  */
  export
  interface IOptions extends Layout.IOptions {
    /**
     * The initial row count for the layout.
     *
     * The default is `1`.
     */
    rowCount?: number;

    /**
     * The initial column count for the layout.
     *
     * The default is `1`.
     */
    columnCount?: number;

    /**
     * The spacing between rows in the layout.
     *
     * The default is `4`.
     */
    rowSpacing?: number;

    /**
     * The spacing between columns in the layout.
     *
     * The default is `4`.
     */
    columnSpacing?: number;
  }
}


/**
 * A type for the execute, undo, and redo functions of a DashboardCommand
 */
type DashboardFunction = (args: DashboardFunction.IOptions) => void;

type OptionalDashboardFunction = DashboardFunction | undefined;


/**
 * Namespace for DashboardCommand options
 */
namespace DashboardCommand {
  export interface IOptions {
    /**
     * The dashboard associated with the command.
     */
    dashboard?: Dashboard;

    /**
     * Function to execute command.
     */
    execute: DashboardFunction;

    /**
     * Function to undo command.
     */
    undo?: OptionalDashboardFunction;

    /**
     * Function to redo command.
     */
    redo?: OptionalDashboardFunction;

    /**
     * The dashboard widget associated with the command.
     * May need to change to an iterable if selecting multiple widgets.
     */
    widget?: DashboardWidget;
  }
}

/**
 * Namespace for DashboardArea options.
 */
namespace DashboardArea {
  export interface IOptions extends Panel.IOptions {

    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;
  }
}

/**
 * Namespace for DashboardFunction options.
 */
namespace DashboardFunction {
  export interface IOptions {
    
    dashboard?: Dashboard;

    widget?: DashboardWidget;

  }
}

/**
 * Adds a button to the toolbar.
 */
export
class DashboardButton implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  _app: JupyterFrontEnd;
  // _dashboard: Dashboard;
  _outputTracker: WidgetTracker<DashboardWidget>;
  _dashboardTracker: WidgetTracker<Dashboard>;
  _tracker: INotebookTracker;
  constructor(app: JupyterFrontEnd, outputTracker: WidgetTracker<DashboardWidget>, dashboardTracker: WidgetTracker<Dashboard>, tracker: INotebookTracker) {
    this._app = app;
    // this._dashboard= new Dashboard({outputTracker});
    this._outputTracker = outputTracker;
    this._dashboardTracker = dashboardTracker;
    this._tracker = tracker;
  }

  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    let callback = () => {
      const outputTracker = this._outputTracker;
      const dashboard = new Dashboard({outputTracker, panel});
      const currentNotebook = this._tracker.currentWidget;
      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-bottom'
      });

      // Add the new dashboard to the tracker.
      // (dashboard.content as DashboardArea).addWidget(ToolbarItems.createSaveButton(dashboard, panel));
      //populate new dashboard based off metadata?
      for(let i = 0; i < panel.content.widgets.length; i++){
        // console.log("cell ", i, " at pos", (panel.content.widgets[i] as Cell).model.metadata.get("pos"));
        // CodeCell.execute(panel.content.widgets[i] as CodeCell, sessionContext: ISessionContext, metadata?: JSONObject):
        // var pos  = (panel.content.widgets[i] as Cell).model.metadata.get("pos");
        // if(pos){
        //   let cell = panel.content.widgets[i] as CodeCell;
        //   let index = i;
        //   let widget = new DashboardWidget({
        //     notebook: panel,
        //     cell,
        //     index
        //   });
        //   (dashboard.content as DashboardArea).addWidget(widget);
        //   // widget.update(pos[0] as number, )
        //   // update(left: number, top: number, width: number, height: number)

        // }
      }
      dashboard.update();
      void this._dashboardTracker.add(dashboard);
    };
    let button = new ToolbarButton({
      className: 'dashboardButton',
      icon: Icons.blueDashboard,
      iconClass: 'dashboard',
      onClick: callback,
      tooltip: 'Create Dashboard'
    });

    panel.toolbar.insertItem(9, 'dashboard', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}

export namespace ToolbarItems {
  /**
   * Create save button toolbar item.
   */

  export function createSaveButton(dashboard: Dashboard, panel: NotebookPanel): Widget {
    return new ToolbarButton({
        icon: saveIcon,
        onClick: () => {
        const widgets = dashboard.content.children().iter();
        let widget = (widgets.next() as DashboardWidget);
        let cell: Cell;
        let pos = [];
        while(widget){
          cell = (widget.cell) as Cell;
          pos = [];
          // pos.push("left");
          pos.push(widget.node.style.left.split('p')[0]);
          // pos.push("top");
          pos.push(widget.node.style.top.split('p')[0]);
          // pos.push("width");
          pos.push(widget.node.style.width.split('p')[0]);
          // pos.push("height");
          pos.push(widget.node.style.height.split('p')[0]);
          cell.model.metadata.set('pos', pos);
          console.log("pos", cell.model.metadata.get("pos"));
          widget = (widgets.next() as DashboardWidget);
          }
          //saving the cell metadata needs to save notebook?
        },
        tooltip: 'Save Dashboard'
      });
    }
}