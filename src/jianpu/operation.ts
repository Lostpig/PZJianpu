import { type Notation, NotationType } from './declare'
import { Jianpu } from './index'

export class SheetOperation {
  private _copy?: Notation
  private _jianpu: Jianpu
  public get jianpu() { return this._jianpu }
  constructor(jianpu: Jianpu) {
    this._jianpu = jianpu
  }

  public copyNotation(nt?: Notation) {
    this._copy = nt ? Jianpu.CloneNotation(nt) : undefined
    if (this._copy?.type === NotationType.Note) this._copy.slur = 0  // 复制时不复制圆滑线
  }
  public pasteAdd() {
    if (this._copy) this._jianpu.addNotation(this._copy, this._jianpu.selectedIndex)
  }
  public pasteOverride(index: number) {
    if (this._copy) this._jianpu.updateNotation(this._copy, index)
  }
}