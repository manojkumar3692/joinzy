export function portalForHost(host='') {
 const name=host.toLowerCase().split(':')[0];
 const root=process.env.PORTAL_ROOT_DOMAIN||'localhost';
 for(const role of ['resident','business','admin'])if(name===`${role}.${root}`)return role;
 return 'public';
}
export function portalUrl(role,path='/',host='localhost:3000',protocol='http:') {
 // Customers stay on the current origin, including preview deployments.
 if(role==='resident'&&['public','resident'].includes(portalForHost(host)))return path;
 const root=process.env.PORTAL_ROOT_DOMAIN||'localhost';
 const port=host.includes(':')?':'+host.split(':').pop():'';
 return `${protocol}//${role==='public'?'':role+'.'}${root}${port}${path}`;
}

export function portalApiRole(host='') {
 const role=portalForHost(host);
 return role==='public'?'resident':role;
}
