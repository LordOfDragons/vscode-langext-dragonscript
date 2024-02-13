import { CstNode } from "chevrotain";
import { DocumentationBlockTextCstNode } from "./blockText";
import { DocumentationBriefCstNode } from "./brief";
import { DocumentationCodeCstNode } from "./code";
import { DocumentationCopyDocCstNode } from "./copyDoc";
import { DocumentationDeprecatedCstNode } from "./deprecated";
import { DocumentationDetailsCstNode } from "./details";
import { DocumentationNoteCstNode } from "./note";
import { DocumentationParagraphCstNode } from "./paragraph";
import { DocumentationParamCstNode } from "./param";
import { DocumentationReturnCstNode } from "./return";
import { DocumentationReturnValueCstNode } from "./returnValue";
import { DocumentationSinceCstNode } from "./since";
import { DocumentationThrowCstNode } from "./throw";
import { DocumentationTodoCstNode } from "./todo";
import { DocumentationVersionCstNode } from "./version";
import { DocumentationWarningCstNode } from "./warning";


export interface DocumentationBlockCstNode extends CstNode {
	name: "docBlock";
	children: DocumentationBlockCstChildren;
}

export type DocumentationBlockCstChildren = {
	ruleBrief?: DocumentationBriefCstNode[];
	ruleDetails?: DocumentationDetailsCstNode[];
	ruleParam?: DocumentationParamCstNode[];
	ruleCode?: DocumentationCodeCstNode[];
	ruleCopyDoc?: DocumentationCopyDocCstNode[];
	ruleNote?: DocumentationNoteCstNode[];
	ruleDeprecated?: DocumentationDeprecatedCstNode[];
	ruleParagraph?: DocumentationParagraphCstNode[];
	ruleReturn?: DocumentationReturnCstNode[];
	ruleReturnValue?: DocumentationReturnValueCstNode[];
	ruleSince?: DocumentationSinceCstNode[];
	ruleVersion?: DocumentationVersionCstNode[];
	ruleThrow?: DocumentationThrowCstNode[];
	ruleTodo?: DocumentationTodoCstNode[];
	ruleWarning?: DocumentationWarningCstNode[];
	docBlockText?: DocumentationBlockTextCstNode[];
};
