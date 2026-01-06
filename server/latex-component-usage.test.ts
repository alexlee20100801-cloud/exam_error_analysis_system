import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("LaTeX Component Usage in Frontend", () => {
  const errorQuestionDetailPath = join(__dirname, "../client/src/pages/ErrorQuestionDetail.tsx");
  const practiceQuestionsPath = join(__dirname, "../client/src/pages/PracticeQuestions.tsx");

  it("should use LatexText for AI analysis fields in ErrorQuestionDetail", () => {
    const content = readFileSync(errorQuestionDetailPath, "utf-8");

    // 检查是否导入了LatexText
    expect(content).toContain('import { LatexText } from "@/components/LatexPreview"');

    // 检查AI分析的各个字段是否使用LatexText
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).errorAnalysis}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).knowledgeGraph}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).keyPointsExplanation}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).mistakesAnalysis}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).solvingStrategy}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).studyAdvice}");
    expect(content).toContain("LatexText text={JSON.parse(question.detailedAnalysis).practiceDirection}");

    // 检查基础分析字段
    expect(content).toContain("LatexText text={question.errorAnalysis}");
    expect(content).toContain("LatexText text={question.detailedExplanation}");

    // 检查题目内容和答案
    expect(content).toContain("LatexText text={question.content}");
    expect(content).toContain("LatexText text={question.userAnswer}");
    expect(content).toContain("LatexText text={question.correctAnswer}");
  });

  it("should use LatexText for question content and answers in PracticeQuestions", () => {
    const content = readFileSync(practiceQuestionsPath, "utf-8");

    // 检查是否导入了LatexText
    expect(content).toContain('import { LatexText } from "@/components/LatexPreview"');

    // 检查题目内容、答案、解析是否使用LatexText
    expect(content).toContain("LatexText text={currentQuestion.content}");
    expect(content).toContain("LatexText text={currentQuestion.answer}");
    expect(content).toContain("LatexText text={currentQuestion.explanation}");
  });

  it("should not use Streamdown for question/answer/analysis content", () => {
    const errorDetailContent = readFileSync(errorQuestionDetailPath, "utf-8");
    const practiceContent = readFileSync(practiceQuestionsPath, "utf-8");

    // 确保没有使用Streamdown渲染题目、答案、分析内容
    // 注意：Streamdown可能用于其他地方（如聊天），所以我们只检查特定模式
    expect(errorDetailContent).not.toContain("<Streamdown>{question.content}</Streamdown>");
    expect(errorDetailContent).not.toContain("<Streamdown>{question.userAnswer}</Streamdown>");
    expect(errorDetailContent).not.toContain("<Streamdown>{question.errorAnalysis}</Streamdown>");
    expect(errorDetailContent).not.toContain("<Streamdown>{question.detailedExplanation}</Streamdown>");

    expect(practiceContent).not.toContain("<Streamdown>{currentQuestion.content}</Streamdown>");
    expect(practiceContent).not.toContain("<Streamdown>{currentQuestion.answer}</Streamdown>");
    expect(practiceContent).not.toContain("<Streamdown>{currentQuestion.explanation}</Streamdown>");
  });

  it("should apply proper CSS classes for LaTeX rendering", () => {
    const errorDetailContent = readFileSync(errorQuestionDetailPath, "utf-8");
    const practiceContent = readFileSync(practiceQuestionsPath, "utf-8");

    // 检查是否应用了prose类以支持markdown样式
    const proseClassPattern = /LatexText.*className=".*prose.*"/;
    expect(errorDetailContent).toMatch(proseClassPattern);
    expect(practiceContent).toMatch(proseClassPattern);

    // 检查是否包含dark模式支持
    const darkProsePattern = /LatexText.*className=".*dark:prose-invert.*"/;
    expect(errorDetailContent).toMatch(darkProsePattern);
    expect(practiceContent).toMatch(darkProsePattern);
  });
});
