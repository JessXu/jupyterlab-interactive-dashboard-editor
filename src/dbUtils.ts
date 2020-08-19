import { ContentsManager } from '@jupyterlab/services';
import { Widgetstore } from './widgetstore';

export class DBUtils {
  public clipboard: Set<Widgetstore.WidgetInfo>;
  public fullscreen: boolean;
  public contents: ContentsManager;
  public selected: Set<Widgetstore.WidgetInfo>;
  constructor() {
    this.clipboard = new Set<Widgetstore.WidgetInfo>();
    this.fullscreen = false;
    this.contents = new ContentsManager();
    this.selected = new Set<Widgetstore.WidgetInfo>();
  }
}
