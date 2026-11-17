/**
 * @file LIN Description File (LDF) grammar for tree-sitter
 * @license MIT
 *
 * Based on the LIN specification (LIN 2.x / ISO 17987-2) description file
 * syntax. The grammar is tolerant where tools deviate from the spec:
 * optional units after node timing values, optional trailing commas,
 * and optional semicolons in sporadic/ETF frame lists.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function commaSep(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

export default grammar({
  name: 'ldf',

  extras: $ => [
    /\s+/,
    $.comment,
  ],

  rules: {
    ldf_file: $ => repeat(choice(
      $.file_marker,
      $.version_declaration,
      $.speed_declaration,
      $.nodes_block,
      $.signals_block,
      $.diagnostic_signals_block,
      $.frames_block,
      $.sporadic_frames_block,
      $.event_triggered_frames_block,
      $.node_attributes_block,
      $.schedule_tables_block,
      $.status_management_block,
      $.general_description,
    )),

    // Not part of the spec, but emitted by some tools.
    comment: $ => choice(
      /\/\/[^\n]*/,
      /\/\*[\s\S]*?\*\//,
    ),

    file_marker: $ => seq('LIN_description_file', ';'),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
    integer: $ => /0[xX][0-9a-fA-F]+|\d+/,
    float: $ => /\d+\.\d+/,
    string: $ => /"[^"]*"/,
    num: $ => choice($.float, $.integer),

    version_declaration: $ => seq(
      choice('LIN_protocol_version', 'LIN_language_version'),
      '=', $.string, ';',
    ),

    speed_declaration: $ => seq('LIN_speed', '=', $.num, 'kbps', ';'),

    // Nodes
    nodes_block: $ => seq(
      'Nodes', '{',
      $.master_definition,
      optional($.slaves_definition),
      '}',
    ),

    master_definition: $ => seq(
      'Master', ':',
      field('name', $.identifier), ',',
      field('time_base', $.num), optional('ms'), ',',
      field('jitter', $.num), optional('ms'), ';',
    ),

    slaves_definition: $ => seq(
      'Slaves', ':',
      commaSep(field('node', $.identifier)), ';',
    ),

    // Signals
    signals_block: $ => seq('Signals', '{', repeat($.signal_definition), '}'),
    diagnostic_signals_block: $ => seq('Diagnostic_signals', '{', repeat($.signal_definition), '}'),

    signal_definition: $ => seq(
      field('name', $.identifier), ':',
      field('size', $.integer),
      optional(seq(',', field('init', $.integer))),
      ',', field('publisher', $.identifier),
      repeat(seq(',', field('receiver', $.identifier))),
      ';',
    ),

    // Frames
    frames_block: $ => seq('Frames', '{', repeat($.frame_definition), '}'),

    frame_definition: $ => seq(
      field('name', $.identifier), ':',
      field('id', $.integer), ',',
      field('transmitter', $.identifier), ',',
      field('size', $.integer),
      '{', repeat($.signal_assignment), '}',
    ),

    signal_assignment: $ => seq(
      field('signal', $.identifier), ',',
      field('offset', $.integer), ';',
    ),

    sporadic_frames_block: $ => seq('Sporadic_frames', '{', repeat($.sporadic_frame), '}'),

    sporadic_frame: $ => seq(
      field('name', $.identifier),
      '{', commaSep(field('frame', $.identifier)), optional(';'), '}',
      optional(';'),
    ),

    event_triggered_frames_block: $ => seq('Event_triggered_frames', '{', repeat($.event_triggered_frame), '}'),

    event_triggered_frame: $ => seq(
      field('name', $.identifier), ':',
      field('id', $.integer), ',',
      field('collision_table', $.identifier),
      '{', commaSep(field('frame', $.identifier)), optional(';'), '}',
      optional(';'),
    ),

    // Node attributes
    node_attributes_block: $ => seq('Node_attributes', '{', repeat($.node_attribute), '}'),

    node_attribute: $ => seq(
      field('name', $.identifier),
      '{', repeat(choice(
        $.lin_protocol_attribute,
        $.nad_attribute,
        $.product_id_attribute,
        $.response_error_attribute,
        $.fault_state_signals_attribute,
        $.configurable_frames_attribute,
      )), '}',
    ),

    lin_protocol_attribute: $ => seq('LIN_protocol', '=', $.string, ';'),

    nad_attribute: $ => seq(
      choice('configured_NAD', 'initial_NAD'),
      '=', field('value', $.integer), ';',
    ),

    product_id_attribute: $ => seq(
      'product_id', '=',
      $.integer, ',', $.integer, ',', $.integer, ';',
    ),

    response_error_attribute: $ => seq(
      'response_error', '=',
      field('signal', $.identifier), ';',
    ),

    fault_state_signals_attribute: $ => seq(
      'fault_state_signals', '=',
      commaSep(field('signal', $.identifier)), ';',
    ),

    configurable_frames_attribute: $ => seq(
      'configurable_frames', '{',
      repeat(seq(field('frame', $.identifier), '=', field('nad', $.integer), ';')),
      '}',
    ),

    // Schedule tables
    schedule_tables_block: $ => seq('Schedule_tables', '{', repeat($.schedule_table), '}'),

    schedule_table: $ => seq(
      field('name', $.identifier),
      '{', repeat($.schedule_slot), '}',
    ),

    schedule_slot: $ => seq(
      field('name', $.identifier),
      field('delay', $.num), 'ms',
      '[', field('frame', $.identifier), ']', ';',
    ),

    // Status management
    status_management_block: $ => seq(
      'Status_management', '{',
      repeat(choice($.response_error_attribute, $.fault_state_signals_attribute)),
      '}',
    ),

    // General description: free-form text
    general_description: $ => seq('General_description', '{', optional($.free_text), '}'),
    free_text: $ => /[^{}]+/,
  },
});
