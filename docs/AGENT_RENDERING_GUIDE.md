# Agent 工作流前端渲染指南

## 概述

Agent 使用 Plan-Execute-Evaluate-Reflect 工作流，在执行过程中会推送不同类型的 ContentBlock。通过 `metadata` 字段可以识别其用途并进行差异化渲染。

---

## ContentBlock Metadata 说明

### 1. Planning Phase (规划阶段)

#### 状态提示
```json
{
  "content_type": "text",
  "text": "🎯 **Planning Phase**: Analyzing request and creating strategy...",
  "metadata": {
    "phase": "planning",
    "type": "status"
  }
}
```
**渲染建议**: 灰色状态条，小字体，可添加加载动画

#### 计划内容
```json
{
  "content_type": "text",
  "text": "📋 Plan Created:\n1. Search for relevant memories\n2. Execute calculation\n3. Format results",
  "metadata": {
    "phase": "planning",
    "type": "plan",
    "steps": ["Search for relevant memories", "Execute calculation", "Format results"]
  }
}
```
**渲染建议**: 
- 可折叠的卡片组件
- 显示步骤列表，可用复选框样式
- 可以根据 `steps` 数组渲染进度指示器

---

### 2. Execution Phase (执行阶段)

#### 执行状态
```json
{
  "content_type": "text",
  "text": "⚡ **Execution Phase**: Working on your request...",
  "metadata": {
    "phase": "execution",
    "type": "status"
  }
}
```
**渲染建议**: 蓝色状态条

#### 步骤进度
```json
{
  "content_type": "text",
  "text": "⚡ **Step 1/3**: Search for relevant memories",
  "metadata": {
    "phase": "execution",
    "type": "step_progress",
    "step": 1,
    "total": 3
  }
}
```
**渲染建议**:
- 显示为进度指示器（如 "Step 1 of 3"）
- 可以用进度条显示 `step/total`
- 高亮当前步骤

#### 工具调用 Placeholder
```json
{
  "event_type": "task_started",
  "payload": {
    "task_id": "tool_call_123",
    "tool_name": "search_long_term_memory",
    "tool_args": {"query": "python projects", "top_k": 5},
    "display_text": "🔧 search_long_term_memory"
  }
}
```
**渲染建议**:
- 显示为独立的加载卡片
- 显示工具名称和参数（可折叠）
- 添加旋转图标或骨架屏

#### 工具完成
```json
{
  "event_type": "task_completed",
  "payload": {
    "task_id": "tool_call_123",
    "remove_placeholder": true
  }
}
```
**渲染建议**: 移除对应的 placeholder，或替换为 "✓ Completed"

#### LLM 文本输出（打字机效果）
```json
{
  "event_type": "text_delta",
  "payload": {
    "delta": "I found 3 relevant memories: "
  }
}
```
**渲染建议**: 
- 逐字符追加到文本区域
- 添加打字机动画效果（CSS `typing` animation）
- 可以在文本末尾显示闪烁的光标

#### 完成所有步骤
```json
{
  "content_type": "text",
  "text": "✅ **All Steps Completed**: Preparing final answer...",
  "metadata": {
    "phase": "execution",
    "type": "status"
  }
}
```
**渲染建议**: 成功状态条，绿色背景

---

### 3. Evaluation Phase (评估阶段)

#### 评估中
```json
{
  "content_type": "text",
  "text": "🔍 **Evaluation Phase**: Checking quality...",
  "metadata": {
    "phase": "evaluation",
    "type": "status"
  }
}
```
**渲染建议**: 黄色/橙色状态条

#### 评估通过
```json
{
  "content_type": "text",
  "text": "✅ Evaluation: PASSED",
  "metadata": {
    "phase": "evaluation",
    "type": "result",
    "status": "pass"
  }
}
```
**渲染建议**: 绿色成功提示，可添加对勾动画

#### 评估失败（会触发重新规划）
```json
{
  "content_type": "text",
  "text": "❌ Evaluation: FAILED - Missing error handling",
  "metadata": {
    "phase": "evaluation",
    "type": "result",
    "status": "fail"
  }
}
```
**渲染建议**: 
- 红色警告提示
- 显示失败原因
- 提示"正在重新规划..."（因为会回到 Planning Phase）

---

### 4. Reflection Phase (反思阶段)

#### 反思中
```json
{
  "content_type": "text",
  "text": "💭 **Reflection Phase**: Learning from this interaction...",
  "metadata": {
    "phase": "reflection",
    "type": "status"
  }
}
```
**渲染建议**: 紫色/蓝色状态条

#### 洞察保存
```json
{
  "content_type": "text",
  "text": "💡 **Insight Saved**: User prefers detailed explanations with code examples",
  "metadata": {
    "phase": "reflection",
    "type": "insight",
    "full_text": "User prefers detailed explanations with code examples and prefers Python over JavaScript"
  }
}
```
**渲染建议**:
- 带灯泡图标的信息框
- 可展开查看完整内容（`metadata.full_text`）
- 浅蓝色背景

#### 无新洞察
```json
{
  "content_type": "text",
  "text": "💭 No new insights to save.",
  "metadata": {
    "phase": "reflection",
    "type": "result"
  }
}
```
**渲染建议**: 灰色提示，小字体

---

## 前端渲染伪代码

### React 示例

```jsx
function ContentBlockRenderer({ block }) {
  const metadata = block.metadata || {};
  
  // 状态提示（Planning, Execution, Evaluation, Reflection）
  if (metadata.type === 'status') {
    return (
      <StatusBar phase={metadata.phase}>
        <Spinner />
        {block.text}
      </StatusBar>
    );
  }
  
  // 计划卡片
  if (metadata.type === 'plan') {
    return (
      <PlanCard>
        <CardHeader>📋 Plan</CardHeader>
        <StepList>
          {metadata.steps.map((step, i) => (
            <StepItem key={i}>
              <StepNumber>{i + 1}</StepNumber>
              <StepText>{step}</StepText>
            </StepItem>
          ))}
        </StepList>
      </PlanCard>
    );
  }
  
  // 步骤进度
  if (metadata.type === 'step_progress') {
    return (
      <ProgressBar current={metadata.step} total={metadata.total}>
        <ProgressText>{block.text}</ProgressText>
      </ProgressBar>
    );
  }
  
  // 评估结果
  if (metadata.phase === 'evaluation' && metadata.type === 'result') {
    const variant = metadata.status === 'pass' ? 'success' : 'error';
    return <Alert variant={variant}>{block.text}</Alert>;
  }
  
  // 洞察
  if (metadata.type === 'insight') {
    return (
      <InsightBox>
        <Icon>💡</Icon>
        <Summary>{block.text}</Summary>
        {metadata.full_text && (
          <Details>
            <DetailsToggle />
            <FullText>{metadata.full_text}</FullText>
          </Details>
        )}
      </InsightBox>
    );
  }
  
  // 默认文本（支持 Markdown）
  return <MarkdownText>{block.text}</MarkdownText>;
}

// 工具调用处理
const [toolPlaceholders, setToolPlaceholders] = useState({});

eventSource.addEventListener('task_started', (e) => {
  const { task_id, display_text, tool_name, tool_args } = JSON.parse(e.data).payload;
  setToolPlaceholders(prev => ({
    ...prev,
    [task_id]: { display_text, tool_name, tool_args, status: 'loading' }
  }));
});

eventSource.addEventListener('task_completed', (e) => {
  const { task_id, remove_placeholder } = JSON.parse(e.data).payload;
  if (remove_placeholder) {
    setToolPlaceholders(prev => {
      const updated = { ...prev };
      delete updated[task_id];
      return updated;
    });
  }
});

// 打字机效果
const [currentText, setCurrentText] = useState('');

eventSource.addEventListener('text_delta', (e) => {
  const { delta } = JSON.parse(e.data).payload;
  setCurrentText(prev => prev + delta);
});
```

---

## UI 设计建议

### 颜色方案
- **Planning**: `#9CA3AF` (Gray)
- **Execution**: `#3B82F6` (Blue)
- **Evaluation**: `#F59E0B` (Orange/Amber)
- **Reflection**: `#8B5CF6` (Purple)
- **Success**: `#10B981` (Green)
- **Error**: `#EF4444` (Red)

### 图标建议
- Planning: 🎯 或 📋
- Execution: ⚡ 或 🔧
- Evaluation: 🔍 或 ✓/✗
- Reflection: 💭 或 💡
- Tool Call: 🔧 或 ⚙️

### 动画建议
- 状态条: Shimmer/Pulse 动画
- 工具 Placeholder: 旋转图标
- 文本输出: 打字机效果（逐字显现）
- 步骤完成: 对勾弹出动画

---

## 完整 SSE 流程示例

```
用户: "帮我写一个 Python 计算器"

→ content_added: 🎯 Planning Phase (status bar)
→ content_added: 📋 Plan with 3 steps (plan card)
→ content_added: ⚡ Step 1/3 (progress bar)
→ task_started: 🔧 search_long_term_memory (loading card)
→ task_completed: remove placeholder
→ text_delta: "I" (typing)
→ text_delta: " found" (typing)
→ text_delta: " relevant" (typing)
→ text_delta: " memories..." (typing)
→ content_added: ⚡ Step 2/3 (progress bar)
→ text_delta: "Here" (typing)
→ text_delta: " is" (typing)
→ text_delta: " your" (typing)
→ text_delta: " calculator..." (typing)
→ content_added: ✅ All Steps Completed (success bar)
→ text_delta: "```python\n" (typing)
→ text_delta: "def" (typing)
→ text_delta: " calc..." (typing)
→ content_added: 🔍 Evaluation Phase (status bar)
→ content_added: ✅ PASSED (success alert)
→ content_added: 💭 Reflection Phase (status bar)
→ content_added: 💡 Insight Saved (info box)
→ message_end
```

每个阶段的 ContentBlock 都是独立的，前端可以根据 `metadata` 进行个性化渲染。

