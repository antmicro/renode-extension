// Copyright (c) 2024 Antmicro <www.antmicro.com>
//
// SPDX-License-Identifier: Apache-2.0
//
// This code is based on https://github.com/WebFreak001/code-debug/blob/f204573fae2f9614aba4be3307984c28576f3b8d/src/backend/backend.ts

import { MINode } from './mi_parse';
import { DebugProtocol } from '@vscode/debugprotocol/lib/debugProtocol';

export type ValuesFormattingMode = 'disabled' | 'parseText' | 'prettyPrinters';

export interface Breakpoint {
  id?: number;
  file?: string;
  line?: number;
  raw?: string;
  condition?: string;
  countCondition?: string;
  logMessage?: string;
}

export interface Thread {
  id: number;
  targetId: string;
  name?: string;
}

export interface Stack {
  level: number;
  address: string;
  function: string;
  fileName: string;
  file: string;
  line: number;
}

export interface Variable {
  name: string;
  valueStr: string;
  type: string;
  raw?: any;
}

export interface RegisterValue {
  index: number;
  value: string;
}

export interface IBackend {
  start(runToStart: boolean): Thenable<boolean>;
  stop(): void;
  detach(): void;
  interrupt(): Thenable<boolean>;
  continue(): Thenable<boolean>;
  next(): Thenable<boolean>;
  step(): Thenable<boolean>;
  stepOut(): Thenable<boolean>;
  loadBreakPoints(
    breakpoints: Breakpoint[],
  ): Thenable<[boolean, Breakpoint?][]>;
  addBreakPoint(breakpoint: Breakpoint): Thenable<[boolean, Breakpoint?]>;
  removeBreakPoint(breakpoint: Breakpoint): Thenable<boolean>;
  clearBreakPoints(source?: string): Thenable<any>;
  getThreads(): Thenable<Thread[]>;
  getStack(
    startFrame: number,
    maxLevels: number,
    thread: number,
  ): Thenable<Stack[]>;
  getStackVariables(thread: number, frame: number): Thenable<Variable[]>;
  evalExpression(name: string, thread: number, frame: number): Thenable<any>;
  isReady(): boolean;
  changeVariable(name: string, rawValue: string): Thenable<any>;
  examineMemory(from: number, to: number): Thenable<any>;
}

export class VariableObject {
  name: string;
  exp: string;
  numchild: number;
  type: string;
  value: string;
  threadId: string;
  frozen: boolean;
  dynamic: boolean;
  displayhint: string;
  hasMore: boolean;
  id: number = 0;
  constructor(node: any) {
    this.name = MINode.valueOf(node, 'name');
    this.exp = MINode.valueOf(node, 'exp');
    this.numchild = parseInt(MINode.valueOf(node, 'numchild'));
    this.type = MINode.valueOf(node, 'type');
    this.value = MINode.valueOf(node, 'value');
    this.threadId = MINode.valueOf(node, 'thread-id');
    this.frozen = !!MINode.valueOf(node, 'frozen');
    this.dynamic = !!MINode.valueOf(node, 'dynamic');
    this.displayhint = MINode.valueOf(node, 'displayhint');
    // TODO: use has_more when it's > 0
    this.hasMore = !!MINode.valueOf(node, 'has_more');
  }

  public applyChanges(node: MINode) {
    this.value = MINode.valueOf(node, 'value');
    if (MINode.valueOf(node, 'type_changed')) {
      this.type = MINode.valueOf(node, 'new_type');
    }
    this.dynamic = !!MINode.valueOf(node, 'dynamic');
    this.displayhint = MINode.valueOf(node, 'displayhint');
    this.hasMore = !!MINode.valueOf(node, 'has_more');
  }

  public isCompound(): boolean {
    return (
      this.numchild > 0 ||
      this.value === '{...}' ||
      (this.dynamic &&
        (this.displayhint === 'array' || this.displayhint === 'map'))
    );
  }

  public toProtocolVariable(): DebugProtocol.Variable {
    const res: DebugProtocol.Variable = {
      name: this.exp,
      evaluateName: this.name,
      value: this.value === void 0 ? '<unknown>' : this.value,
      type: this.type,
      variablesReference: this.id,
    };
    return res;
  }
}

export class MIError extends Error {
  public readonly source: string;
  constructor(message: string, source: string) {
    super(message);
    this.source = source;
  }

  public toString() {
    return `${this.message} (from ${this.source})`;
  }
}
