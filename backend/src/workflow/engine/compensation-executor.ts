import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';

export type CompensationAction =
  | { type: 'deleteVar'; key: string }
  | { type: 'setVar'; key: string; value: any }
  | {
      type: 'http';
      method: 'POST' | 'PUT' | 'DELETE';
      url: string;
      body?: any;
      headers?: Record<string, string>;
    }
  | { type: 'fileDelete'; filePath: string }
  | { type: 'dbUpdate'; table: string; id: string; changes: Record<string, any>; idColumn?: string }
  | { type: 'log'; message: string };

@Injectable()
export class CompensationExecutor {
  constructor(private dataSource: DataSource) {}

  async execute(
    action: CompensationAction,
    context: { variables: Record<string, any> },
    logs: string[],
  ) {
    switch (action.type) {
      case 'deleteVar':
        if (context.variables[action.key] !== undefined) {
          delete context.variables[action.key];
        }
        return;
      case 'setVar':
        context.variables[action.key] = action.value;
        return;
      case 'log':
        logs.push(action.message);
        return;
      case 'http':
        await this.executeHttp(action, logs);
        return;
      case 'fileDelete':
        await this.deleteFile(action.filePath, logs);
        return;
      case 'dbUpdate':
        await this.updateDatabase(action, logs);
        return;
    }
  }

  private async executeHttp(action: Extract<CompensationAction, { type: 'http' }>, logs: string[]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json', ...(action.headers || {}) },
        body: action.body ? JSON.stringify(action.body) : undefined,
        signal: controller.signal,
      });
    } catch (error: any) {
      logs.push(`补偿HTTP失败：${error?.message || '请求失败'}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async deleteFile(filePath: string, logs: string[]) {
    const root = process.env.COMPENSATION_FILE_ROOT;
    if (!root) {
      logs.push('补偿文件删除失败：未配置 COMPENSATION_FILE_ROOT');
      return;
    }
    const safeRoot = path.resolve(root);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(safeRoot)) {
      logs.push('补偿文件删除失败：路径不在允许范围内');
      return;
    }
    try {
      if (fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch (error: any) {
      logs.push(`补偿文件删除失败：${error?.message || '删除失败'}`);
    }
  }

  private async updateDatabase(
    action: Extract<CompensationAction, { type: 'dbUpdate' }>,
    logs: string[],
  ) {
    const table = String(action.table);
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
      logs.push('补偿数据库失败：表名不合法');
      return;
    }
    const idColumn = action.idColumn || 'id';
    try {
      await this.dataSource
        .createQueryBuilder()
        .update(table)
        .set(action.changes || {})
        .where(`${idColumn} = :id`, { id: action.id })
        .execute();
    } catch (error: any) {
      logs.push(`补偿数据库失败：${error?.message || '更新失败'}`);
    }
  }
}
