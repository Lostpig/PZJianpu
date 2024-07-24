<script lang="ts">
import { createEventDispatcher } from 'svelte'

export let visible = false

const dispatcher = createEventDispatcher()
const closeDialog = () => {
  dispatcher('close')
}
</script>

<div class="dialog-container" class:visible={visible}>
  <div class="dialog help-dialog">
    <header>说明</header>
    <div class="content">
      <div>键盘操作</div>
      <div class="row">
        <div class="bordered">1~7</div>
        <div class="description">设置音符唱名为1 ~ 7</div>
      </div>
      <div class="row">
        <div class="bordered">0</div>
        <div class="description">设置音符为休止符</div>
      </div>
      <div class="row">
        <div class="bordered">.</div>
        <div class="description">添加 / 取消附点，仅限在音符上操作</div>
      </div>
      <div class="row">
        <div class="bordered">←</div>
        <div class="bordered">→</div>
        <div class="description">移动选中的音符，当在铺面末尾向右移动时，自动添加新音符</div>
      </div>
      <div class="row">
        <div class="bordered">↑</div>
        <div class="bordered">↓</div>
        <div class="description">修改音符的八度</div>
      </div>
      <div class="row">
        <div class="bordered">+</div>
        <div class="bordered">-</div>
        <div class="description">修改音符时值，最多支持64分音符</div>
      </div>
      <div class="row">
        <div class="bordered">/</div>
        <div class="bordered">*</div>
        <div class="description">修改音符升 / 降调</div>
      </div>
      <div class="row">
        <div class="bordered">[</div>
        <div class="bordered">]</div>
        <div class="description">设置圆滑线起始 / 结束</div>
      </div>
      <div class="row">
        <div class="bordered">\</div>
        <div class="description">删除圆滑线</div>
      </div>
      <div class="row">
        <div class="bordered">Ins</div>
        <div class="description">在当前位置插入新音符</div>
      </div>
      <div class="row">
        <div class="bordered">Del</div>
        <div class="description">删除当前音符</div>
      </div>
      <hr>
      <div>其他</div>
      <div class="row">
        <div class="description">【N连音】和【装饰音】功能无法通过键盘上操作，需要在音符属性面板上设置</div>
      </div>
    </div>
    <footer>
      <button type="button" class="gray" on:click={closeDialog}>关闭</button>
    </footer>
  </div>
</div>

<style>
  .help-dialog {
    min-width: 700px;
  }
  .bordered {
    border: var(--custom-border);
    border-radius: 0.5rem;
    padding: 0.5rem;
    color: #636363;
    text-align: center;
    min-width: 1.5rem;
    margin-right: 0.5rem;
  }
  .row {
    display: flex;
    align-items: center;
    margin-top: 0.5rem;
  }
  .description {
    flex: 1;
  }
</style>