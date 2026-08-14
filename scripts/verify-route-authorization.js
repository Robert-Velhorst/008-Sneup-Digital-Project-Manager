const fs = require('fs');
const { METHODS } = require('node:http');
const path = require('path');
const espree = require('espree');
const { ALL_PERMISSIONS } = require('../src/utils/requestSecurity');

const HTTP_ROUTE_METHODS = new Set(['all', ...METHODS.map(method => method.toLowerCase())]);

const PUBLIC_ROUTE_CONTRACTS = Object.freeze({
  'connectors.js:GET:/:connectorId/callback': Object.freeze({
    handlerCalls: ['accountConnectorService.completeOAuth'],
    reason: 'OAuth callback validates its one-time signed state in the connector service.'
  }),
  'webhooks.js:POST:/trello': Object.freeze({
    middleware: ['verifyTrelloWebhook'],
    reason: 'Trello delivery requires the provider HMAC middleware.'
  }),
  'webhooks.js:HEAD:/trello': Object.freeze({
    staticHeadResponse: true,
    reason: 'Trello uses an unauthenticated, side-effect-free HEAD verification response.'
  }),
  'webhooks.js:POST:/generic/:accountId/worker-response': Object.freeze({
    handlerCalls: ['genericWebhookService.ingestWorkerResponse'],
    reason: 'The generic webhook service verifies the account signature and delivery identity.'
  }),
  'webhooks.js:POST:/generic/:accountId': Object.freeze({
    handlerCalls: ['genericWebhookService.ingest'],
    reason: 'The generic webhook service verifies the account signature and delivery identity.'
  }),
  'workspaces.js:POST:/invitations/accept': Object.freeze({
    handlerCalls: ['workspaceInviteService.acceptInvite'],
    reason: 'Invitation acceptance consumes a one-time hashed invitation token.'
  })
});

const isNode = value => Boolean(value && typeof value === 'object' && typeof value.type === 'string');

const walk = (node, visit) => {
  if (!isNode(node)) return;
  visit(node);
  Object.entries(node).forEach(([key, value]) => {
    if (key === 'parent') return;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else walk(value, visit);
  });
};

const expressionName = (node) => {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'CallExpression') return expressionName(node.callee);
  if (node.type !== 'MemberExpression' || node.computed) return null;
  const objectName = expressionName(node.object);
  const propertyName = expressionName(node.property);
  return objectName && propertyName ? `${objectName}.${propertyName}` : null;
};

const literalString = node => node?.type === 'Literal' && typeof node.value === 'string'
  ? node.value
  : null;

const memberPropertyName = node => {
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed && node.property?.type === 'Identifier') return node.property.name;
  return literalString(node.property);
};

const chainedRoutePath = (node) => {
  let current = node;
  while (current?.type === 'CallExpression' && current.callee?.type === 'MemberExpression') {
    if (current.callee.object?.type === 'Identifier'
      && current.callee.object.name === 'router'
      && memberPropertyName(current.callee) === 'route') {
      return literalString(current.arguments[0]);
    }
    current = current.callee.object;
  }
  return null;
};

const routeCallDetails = (node, fileName) => {
  if (node.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') {
    return null;
  }

  const method = memberPropertyName(node.callee);
  if (!HTTP_ROUTE_METHODS.has(method)) return null;

  const direct = node.callee.object?.type === 'Identifier' && node.callee.object.name === 'router';
  const routePath = direct ? literalString(node.arguments[0]) : chainedRoutePath(node.callee.object);
  if (!direct && !routePath) return null;

  return {
    fileName,
    key: `${fileName}:${method.toUpperCase()}:${routePath || '<dynamic>'}`,
    line: node.loc.start.line,
    method,
    path: routePath,
    middlewareArguments: direct ? node.arguments.slice(1) : node.arguments,
    node
  };
};

const permissionCallsInArgument = (node, calls = []) => {
  if (!node) return calls;
  if (node.type === 'CallExpression' && expressionName(node.callee) === 'requirePermission') {
    calls.push(node);
    return calls;
  }
  if (node.type === 'ArrayExpression') {
    node.elements.forEach(element => permissionCallsInArgument(element, calls));
  }
  return calls;
};

const directMiddlewareNames = route => route.middlewareArguments
  .filter(argument => argument?.type === 'Identifier')
  .map(argument => argument.name);

const routeHandler = route => [...route.middlewareArguments]
  .reverse()
  .find(argument => argument?.type === 'ArrowFunctionExpression' || argument?.type === 'FunctionExpression');

const handlerCallNames = handler => {
  const calls = new Set();
  walk(handler, (node) => {
    if (node.type === 'CallExpression') {
      const name = expressionName(node.callee);
      if (name) calls.add(name);
    }
  });
  return calls;
};

const validatesStaticHeadResponse = (handler) => {
  if (!handler || handler.async) return false;
  let statusOk = false;
  let bodyOk = false;
  let hasAwait = false;
  let hasUnexpectedCall = false;
  const allowedCalls = new Set(['res.status', 'res.status.send']);

  walk(handler, (node) => {
    if (node.type === 'AwaitExpression') hasAwait = true;
    if (node.type !== 'CallExpression') return;
    const name = expressionName(node.callee);
    if (!allowedCalls.has(name)) hasUnexpectedCall = true;
    if (name === 'res.status' && node.arguments[0]?.type === 'Literal' && node.arguments[0].value === 200) {
      statusOk = true;
    }
    if (name === 'res.status.send' && node.arguments[0]?.type === 'Literal' && node.arguments[0].value === 'OK') {
      bodyOk = true;
    }
  });

  return statusOk && bodyOk && !hasAwait && !hasUnexpectedCall;
};

const validatePublicRoute = (route, contract) => {
  const issues = [];
  const middleware = new Set(directMiddlewareNames(route));
  const handler = routeHandler(route);
  const calls = handlerCallNames(handler);

  (contract.middleware || []).forEach((name) => {
    if (!middleware.has(name)) issues.push(`missing public-route middleware ${name}`);
  });
  (contract.handlerCalls || []).forEach((name) => {
    if (!calls.has(name)) issues.push(`missing public-route verification call ${name}`);
  });
  if (contract.staticHeadResponse && !validatesStaticHeadResponse(handler)) {
    issues.push('HEAD verification must stay synchronous, side-effect-free, and return 200 OK');
  }

  return issues;
};

const parseRouteSource = ({ fileName, source }) => {
  const ast = espree.parse(source, {
    ecmaVersion: 'latest',
    loc: true,
    sourceType: 'script'
  });
  const routes = [];
  walk(ast, (node) => {
    const route = routeCallDetails(node, fileName);
    if (route) routes.push(route);
  });
  return routes;
};

const auditRouteSources = ({ sources, publicContracts = PUBLIC_ROUTE_CONTRACTS }) => {
  const knownPermissions = new Set(ALL_PERMISSIONS);
  const issues = [];
  const routes = [];

  sources.forEach(({ fileName, source }) => {
    let parsedRoutes;
    try {
      parsedRoutes = parseRouteSource({ fileName, source });
    } catch (error) {
      issues.push({ fileName, line: error.lineNumber || 0, message: `route source could not be parsed: ${error.message}` });
      return;
    }

    const ast = espree.parse(source, { ecmaVersion: 'latest', loc: true, sourceType: 'script' });
    walk(ast, (node) => {
      const aliasesRouter = node.type === 'VariableDeclarator'
        && node.init?.type === 'Identifier'
        && node.init.name === 'router';
      const assignsRouter = node.type === 'AssignmentExpression'
        && node.left?.type === 'Identifier'
        && node.right?.type === 'Identifier'
        && node.right.name === 'router';
      if (aliasesRouter || assignsRouter) {
        issues.push({
          fileName,
          line: node.loc.start.line,
          message: 'router aliases are not allowed because route authorization must remain statically auditable'
        });
      }
    });

    parsedRoutes.forEach((route) => {
      routes.push(route);
      if (!route.path) {
        issues.push({ fileName, line: route.line, message: `${route.method.toUpperCase()} route path must be a string literal` });
        return;
      }

      const permissionCalls = route.middlewareArguments
        .flatMap(argument => permissionCallsInArgument(argument));
      if (permissionCalls.length > 0) {
        permissionCalls.forEach((call) => {
          const permission = literalString(call.arguments[0]);
          if (!permission || !knownPermissions.has(permission)) {
            issues.push({
              fileName,
              line: call.loc.start.line,
              message: `${route.method.toUpperCase()} ${route.path} uses an unknown or dynamic permission`
            });
          }
        });
        return;
      }

      const contract = publicContracts[route.key];
      if (!contract) {
        issues.push({ fileName, line: route.line, message: `${route.method.toUpperCase()} ${route.path} has no permission guard or public-route contract` });
        return;
      }

      validatePublicRoute(route, contract).forEach((message) => {
        issues.push({ fileName, line: route.line, message: `${route.method.toUpperCase()} ${route.path}: ${message}` });
      });
    });
  });

  Object.keys(publicContracts).forEach((key) => {
    if (!routes.some(route => route.key === key)) {
      issues.push({ fileName: key.split(':')[0], line: 0, message: `public-route contract does not match a current route: ${key}` });
    }
  });

  const publicRoutes = routes.filter(route => Object.hasOwn(publicContracts, route.key));
  const methods = routes.reduce((summary, route) => {
    summary[route.method] = (summary[route.method] || 0) + 1;
    return summary;
  }, {});

  return {
    success: issues.length === 0,
    routeCount: routes.length,
    guardedRouteCount: routes.length - publicRoutes.length,
    publicRouteCount: publicRoutes.length,
    methods,
    publicRoutes: publicRoutes.map(route => ({
      key: route.key,
      reason: publicContracts[route.key].reason
    })),
    issues
  };
};

const auditRoutesDirectory = (routesDirectory = path.join(__dirname, '..', 'src', 'routes')) => {
  const sources = fs.readdirSync(routesDirectory)
    .filter(fileName => fileName.endsWith('.js'))
    .sort()
    .map(fileName => ({
      fileName,
      source: fs.readFileSync(path.join(routesDirectory, fileName), 'utf8')
    }));
  return auditRouteSources({ sources });
};

if (require.main === module) {
  const report = auditRoutesDirectory();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.success) process.exitCode = 1;
}

module.exports = {
  HTTP_ROUTE_METHODS,
  PUBLIC_ROUTE_CONTRACTS,
  auditRouteSources,
  auditRoutesDirectory,
  parseRouteSource
};
