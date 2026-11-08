const { layout } = require('./layout');

/** Place files within labeled immediate-folder areas; parents precede children and areas never overlap initially. */
function folderLayout(graph) {
  const projected = layout(graph);
  const folders = new Map();
  for (const node of projected.nodes) {
    const file = node.data.file;
    const folder = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : '.';
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push(node);
  }
  for (const resource of graph.resources || [])
    if (resource.kind === 'folder' && !folders.has(resource.file)) folders.set(resource.file, []);
  const nodes = [];
  let y = 0;
  for (const [folder, members] of folders) {
    const id = `folder:${folder}`;
    const width = members.length > 1 ? 660 : 330;
    const height = 70 + Math.ceil(members.length / 2) * 190;
    nodes.push({
      id,
      type: 'folder',
      position: { x: 0, y },
      style: { width, height },
      selectable: false,
      data: { name: folder, displayName: folder, fileCount: members.length },
      ariaLabel: `Folder ${folder}: ${members.length} files`,
    });
    members.forEach((node, index) =>
      nodes.push({
        ...node,
        type: 'file',
        data: { ...node.data, displayName: node.data.file },
        parentId: id,
        extent: 'parent',
        position: { x: 30 + (index % 2) * 330, y: 65 + Math.floor(index / 2) * 190 },
      }),
    );
    y += height + 100;
  }
  return {
    nodes,
    edges: projected.edges.map((edge, index) => ({
      ...edge,
      zIndex: 1,
      label: `${graph.edges[index].count} ${graph.edges[index].kind === 'render' ? 'render' : 'call'} links`,
    })),
  };
}

module.exports = { folderLayout };
