import { TransferList } from './@types/index';

type ResolveFunc = (value: any) => void;
type RejectFunc = (reason: any) => void;

export interface TaskConfig {
  timeout?: number;
  transferList?: TransferList;
}

export class TaskContainer {
  constructor(
    public param: any,
    public resolve: ResolveFunc,
    public reject: RejectFunc,
    public taskConfig: TaskConfig
  ) {}
}
