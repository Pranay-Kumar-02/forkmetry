/**
 * Forkmetry — Process Tree Layout Engine
 * 
 * Independently implemented 2D hierarchical positioning algorithm for OS process trees.
 * Computes node coordinates, bounding boxes, depth levels, and orthogonal/bezier links
 * with subtree collision avoidance and orphan process clustering.
 * 
 * Maintainer: Pranay Kumar Vonamala
 */

import { PCB } from '../types/process';

export interface PositionedNode {
  pcb: PCB;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
}

export interface TreeLink {
  id: string;
  fromPid: number;
  toPid: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface TreeLayoutResult {
  nodes: PositionedNode[];
  links: TreeLink[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  paddingX?: number;
  paddingY?: number;
}

interface InternalLayoutNode {
  pcb: PCB;
  children: InternalLayoutNode[];
  x: number;
  y: number;
  level: number;
  subtreeWidth: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 220,
  nodeHeight: 100,
  horizontalGap: 60,
  verticalGap: 100,
  paddingX: 50,
  paddingY: 50,
};

/**
 * Calculates a balanced hierarchical tree layout for OS processes.
 * Centers parent processes directly above the midpoint of their child spans.
 */
export function calculateTreeLayout(
  processes: PCB[],
  rootPid: number = 1,
  options: LayoutOptions = {}
): TreeLayoutResult {
  const opts: Required<LayoutOptions> = { ...DEFAULT_OPTIONS, ...options };
  const activeProcesses = processes.filter((p) => p.state !== 'terminated');
  const procMap = new Map<number, PCB>();
  processes.forEach((p) => procMap.set(p.pid, p));

  // Determine root: either explicitly requested rootPid, ppid===0, or lowest PID
  let rootPcb = procMap.get(rootPid);
  if (!rootPcb && processes.length > 0) {
    rootPcb = processes.find((p) => p.ppid === 0) || processes[0];
  }

  if (!rootPcb) {
    return {
      nodes: [],
      links: [],
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  // Recursive subtree builder
  function buildSubtree(current: PCB, level: number): InternalLayoutNode {
    const childPcbs = activeProcesses.filter(
      (p) => p.ppid === current.pid && p.pid !== current.pid
    );
    const children = childPcbs.map((child) => buildSubtree(child, level + 1));

    return {
      pcb: current,
      children,
      x: 0,
      y: level * (opts.nodeHeight + opts.verticalGap),
      level,
      subtreeWidth: 0,
    };
  }

  const rootNode = buildSubtree(rootPcb, 0);

  // Bottom-up subtree bounding calculation
  function computeSubtreeBounds(node: InternalLayoutNode): number {
    if (node.children.length === 0) {
      node.subtreeWidth = opts.nodeWidth;
      return opts.nodeWidth;
    }

    let childrenTotalWidth = 0;
    for (const child of node.children) {
      childrenTotalWidth += computeSubtreeBounds(child);
    }
    childrenTotalWidth += (node.children.length - 1) * opts.horizontalGap;

    node.subtreeWidth = Math.max(opts.nodeWidth, childrenTotalWidth);
    return node.subtreeWidth;
  }

  computeSubtreeBounds(rootNode);

  // Top-down position assignment
  function assignCoordinates(node: InternalLayoutNode, startX: number) {
    if (node.children.length === 0) {
      node.x = startX + (node.subtreeWidth - opts.nodeWidth) / 2;
      return;
    }

    let currentX = startX;
    for (const child of node.children) {
      assignCoordinates(child, currentX);
      currentX += child.subtreeWidth + opts.horizontalGap;
    }

    const firstChildCenter = node.children[0].x + opts.nodeWidth / 2;
    const lastChildCenter = node.children[node.children.length - 1].x + opts.nodeWidth / 2;
    node.x = (firstChildCenter + lastChildCenter) / 2 - opts.nodeWidth / 2;
  }

  assignCoordinates(rootNode, opts.paddingX);

  // Flatten nodes and build link connections
  const nodes: PositionedNode[] = [];
  const links: TreeLink[] = [];

  function traverseTree(node: InternalLayoutNode) {
    nodes.push({
      pcb: node.pcb,
      x: node.x,
      y: node.y + opts.paddingY,
      width: opts.nodeWidth,
      height: opts.nodeHeight,
      level: node.level,
    });

    for (const child of node.children) {
      links.push({
        id: `link-${node.pcb.pid}-${child.pcb.pid}`,
        fromPid: node.pcb.pid,
        toPid: child.pcb.pid,
        fromX: node.x + opts.nodeWidth / 2,
        fromY: node.y + opts.paddingY + opts.nodeHeight,
        toX: child.x + opts.nodeWidth / 2,
        toY: child.y + opts.paddingY,
      });
      traverseTree(child);
    }
  }

  traverseTree(rootNode);

  // Handle orphan / unattached processes (processes detached from main tree)
  const includedPids = new Set(nodes.map((n) => n.pcb.pid));
  const orphans = activeProcesses.filter((p) => !includedPids.has(p.pid));

  if (orphans.length > 0) {
    let orphanStartX = (nodes.length > 0 ? Math.max(...nodes.map((n) => n.x + n.width)) : 0) + 120;
    orphans.forEach((orphan, idx) => {
      nodes.push({
        pcb: orphan,
        x: orphanStartX + idx * (opts.nodeWidth + 40),
        y: opts.paddingY,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        level: 0,
      });
    });
  }

  const allX = nodes.map((n) => n.x);
  const allY = nodes.map((n) => n.y);
  const minX = Math.min(...allX, 0);
  const maxX = Math.max(...nodes.map((n) => n.x + n.width), 800);
  const minY = Math.min(...allY, 0);
  const maxY = Math.max(...nodes.map((n) => n.y + n.height), 600);

  return {
    nodes,
    links,
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + opts.paddingX * 2,
    height: maxY - minY + opts.paddingY * 2,
  };
}
