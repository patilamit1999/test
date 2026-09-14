import test from 'node:test';
import assert from 'node:assert/strict';
import { START, DARSHAN, PRASAD, canWalk, moveVisitor, nearbyStation, cleanName, joystickVector } from '../src/world.js';

test('joystick has a dead zone and ignores invalid input', () => {
  for (const [x, y, radius] of [[0, 0, 40], [3, 3, 40], [NaN, 2, 40], [0, Infinity, 40], [10, 10, 0]]) {
    assert.deepEqual(joystickVector(x, y, radius), { x: 0, z: 0 });
  }
});

test('joystick maps all directions and limits diagonal speed', () => {
  assert.deepEqual(joystickVector(40, 0, 40), { x: 1, z: 0 });
  assert.deepEqual(joystickVector(0, -40, 40), { x: 0, z: -1 });
  assert.deepEqual(joystickVector(-40, 0, 40), { x: -1, z: 0 });
  assert.deepEqual(joystickVector(0, 40, 40), { x: 0, z: 1 });
  const diagonal = joystickVector(200, -200, 40);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 0.00001);
  assert.ok(diagonal.x > 0 && diagonal.z < 0);
});

test('small joystick deflections move more slowly than full deflections', () => {
  const gentle = joystickVector(15, 0, 40);
  const medium = joystickVector(25, 0, 40);
  const full = joystickVector(40, 0, 40);
  assert.ok(gentle.x > 0 && gentle.x < medium.x && medium.x < full.x);
  const start = { x: 0, z: 0 };
  assert.ok(moveVisitor(start, gentle.x, gentle.z).x < moveVisitor(start, full.x, full.z).x);
});

test('all visitor destinations are walkable', () => {
  for (const position of [START, DARSHAN, PRASAD]) assert.equal(canWalk(position.x, position.z), true);
});

test('visitors cannot enter the shrine, counter, columns, or musicians', () => {
  for (const [x, z] of [[0, -7], [7, 0], [6, 1], [-6, 7], [3.9, 7.8], [-3.9, 10.3]]) assert.equal(canWalk(x, z), false);
});

test('walking is bounded and rejects non-finite coordinates', () => {
  for (const [x, z] of [[9.1, 0], [-9.1, 0], [0, 13.1], [0, -9.1], [NaN, 0], [0, Infinity]]) assert.equal(canWalk(x, z), false);
});

test('walking slides along an obstruction without mutating the original position', () => {
  const position = { x: 5, z: 1 };
  const next = moveVisitor(position, 0.4, 0.1);
  assert.deepEqual(position, { x: 5, z: 1 });
  assert.equal(next.x, 5);
  assert.equal(next.z, 1.1);
});

test('the central aisle reaches the darshan area but stops before the shrine', () => {
  let position = { ...START };
  for (let i = 0; i < 180; i++) position = moveVisitor(position, 0, -0.1);
  assert.equal(nearbyStation(position), 'darshan');
  assert.ok(position.z > -4.3);
});

test('interactions require proximity to the correct station', () => {
  assert.equal(nearbyStation(START), null);
  assert.equal(nearbyStation(DARSHAN), 'darshan');
  assert.equal(nearbyStation(PRASAD), 'prasad');
  assert.equal(nearbyStation({ x: -7, z: 3 }), null);
});

test('names are trimmed, length-limited, and support Marathi', () => {
  assert.equal(cleanName('  Aarav   Patil  '), 'Aarav Patil');
  assert.equal(cleanName('   '), '');
  assert.equal(cleanName('  गणेश  '), 'गणेश');
  assert.equal(cleanName('a'.repeat(50)).length, 24);
});
