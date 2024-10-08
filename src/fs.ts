// Copyright (c) 2024 Antmicro <www.antmicro.com>
//
// SPDX-License-Identifier: Apache-2.0

import vscode from 'vscode';
import { RenodePluginContext } from './context';

export class RenodeFsProvider implements vscode.FileSystemProvider {
  private fileChangeEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]>;

  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]>;

  constructor(private pluginCtx: RenodePluginContext) {
    this.fileChangeEmitter = new vscode.EventEmitter();
    this.onDidChangeFile = this.fileChangeEmitter.event;
  }

  watch(
    _uri: vscode.Uri,
    _options: {
      readonly recursive: boolean;
      readonly excludes: readonly string[];
    },
  ): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    if (uri.path === '/') {
      return {
        type: vscode.FileType.Directory,
        ctime: 0,
        mtime: 0,
        size: 1,
        permissions: vscode.FilePermission.Readonly,
      };
    }

    try {
      const res = await this.pluginCtx.statFile(uri.path);
      return {
        ...res,
        type:
          (res.isfile ? vscode.FileType.File : vscode.FileType.Directory) |
          (res.islink ? vscode.FileType.SymbolicLink : 0),
      };
    } catch {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const files = await this.pluginCtx.listFiles(uri.path);
    return files.map(file => [
      file.name,
      (file.isfile ? vscode.FileType.File : vscode.FileType.Directory) |
        (file.islink ? vscode.FileType.SymbolicLink : 0),
    ]);
  }

  async createDirectory(uri: vscode.Uri): Promise<void> {
    return this.pluginCtx.createDirectory(uri.path);
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return this.pluginCtx.downloadFile(uri.path);
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    _options: { readonly create: boolean; readonly overwrite: boolean },
  ): Promise<void> {
    return this.pluginCtx.sendFileFromContent(uri.path, content);
  }

  async delete(
    uri: vscode.Uri,
    options: { readonly recursive: boolean },
  ): Promise<void> {
    return this.pluginCtx.removeFile(uri.path);
  }

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { readonly overwrite: boolean },
  ): Promise<void> {
    return this.pluginCtx.moveFile(oldUri.path, newUri.path);
  }

  async copy(
    source: vscode.Uri,
    destination: vscode.Uri,
    options: { readonly overwrite: boolean },
  ): Promise<void> {
    return this.pluginCtx.copyFile(source.path, destination.path);
  }
}
