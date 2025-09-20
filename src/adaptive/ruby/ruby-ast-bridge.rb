#!/usr/bin/env ruby
# Ruby AST Bridge - Uses Ruby's native parser for accurate AST extraction
# Every Ruby developer has Ruby installed, so this should always work

require 'json'
require 'ripper'
require 'pathname'

class RubyASTBridge
  def initialize(file_path)
    @file_path = file_path
    @content = File.read(file_path)
    @metadata = {
      'classes' => [],
      'modules' => [],
      'methods' => [],
      'constants' => [],
      'attributes' => [],
      'requires' => [],
      'includes' => [],
      'extends' => [],
      'version' => RUBY_VERSION,
      'parser' => 'Ripper'
    }
  end

  def parse
    begin
      # Use Ripper for AST parsing - built into Ruby since 1.9
      ast = Ripper.sexp(@content)

      if ast
        process_ast(ast)
        @metadata['success'] = true
      else
        # Try alternative parser if available
        try_parser_gem
      end
    rescue => e
      @metadata['error'] = e.message
      @metadata['success'] = false
      # Still try to extract basic info with regex as last resort
      basic_extraction
    end

    JSON.generate(@metadata)
  end

  private

  def process_ast(node, context = {})
    return unless node.is_a?(Array)

    case node[0]
    when :class
      process_class(node, context)
    when :module
      process_module(node, context)
    when :def
      process_method(node, context)
    when :defs
      process_class_method(node, context)
    when :assign, :opassign
      process_assignment(node, context)
    when :command, :fcall
      process_command(node, context)
    when :const_ref
      process_constant(node, context)
    when :method_add_arg
      process_method_call(node, context)
    end

    # Recursively process child nodes
    node.each do |child|
      process_ast(child, context) if child.is_a?(Array)
    end
  end

  def process_class(node, context)
    class_name = extract_const_name(node[1])
    superclass = extract_const_name(node[2]) if node[2]

    class_info = {
      'name' => class_name,
      'fullName' => build_full_name(context, class_name),
      'superclass' => superclass,
      'methods' => [],
      'classMethods' => [],
      'attributes' => [],
      'constants' => [],
      'line' => extract_line_number(node)
    }

    # Process class body with updated context
    new_context = context.merge('class' => class_info, 'current_type' => 'class')
    process_ast(node[3], new_context) if node[3]

    @metadata['classes'] << class_info
  end

  def process_module(node, context)
    module_name = extract_const_name(node[1])

    module_info = {
      'name' => module_name,
      'fullName' => build_full_name(context, module_name),
      'methods' => [],
      'classMethods' => [],
      'constants' => [],
      'line' => extract_line_number(node)
    }

    # Process module body with updated context
    new_context = context.merge('module' => module_info, 'current_type' => 'module')
    process_ast(node[2], new_context) if node[2]

    @metadata['modules'] << module_info
  end

  def process_method(node, context)
    method_name = node[1].to_s if node[1]
    params = extract_parameters(node[2]) if node[2]

    method_info = {
      'name' => method_name,
      'parameters' => params || [],
      'visibility' => context['visibility'] || 'public',
      'line' => extract_line_number(node)
    }

    # Add to appropriate container
    if context['class']
      context['class']['methods'] << method_info
    elsif context['module']
      context['module']['methods'] << method_info
    else
      @metadata['methods'] << method_info
    end
  end

  def process_class_method(node, context)
    # defs node: [defs, receiver, method_name, params, body]
    method_name = node[2].to_s if node[2]
    params = extract_parameters(node[3]) if node[3]

    method_info = {
      'name' => method_name,
      'parameters' => params || [],
      'type' => 'class',
      'line' => extract_line_number(node)
    }

    if context['class']
      context['class']['classMethods'] << method_info
    elsif context['module']
      context['module']['classMethods'] << method_info
    else
      @metadata['methods'] << method_info
    end
  end

  def process_assignment(node, context)
    if node[1] && node[1][0] == :const_ref
      const_name = extract_const_name(node[1])
      const_info = {
        'name' => const_name,
        'line' => extract_line_number(node)
      }

      if context['class']
        context['class']['constants'] << const_info
      elsif context['module']
        context['module']['constants'] << const_info
      else
        @metadata['constants'] << const_info
      end
    end
  end

  def process_command(node, context)
    command = node[1].to_s if node[1]

    case command
    when 'require', 'require_relative'
      if node[2] && node[2][0] == :string_literal
        path = extract_string(node[2])
        @metadata['requires'] << path if path
      end
    when 'include'
      if node[2]
        module_name = extract_const_name(node[2])
        @metadata['includes'] << module_name if module_name
      end
    when 'extend'
      if node[2]
        module_name = extract_const_name(node[2])
        @metadata['extends'] << module_name if module_name
      end
    when 'attr_reader', 'attr_writer', 'attr_accessor'
      process_attributes(node, context, command)
    when 'private', 'protected', 'public'
      context['visibility'] = command
    end
  end

  def process_attributes(node, context, type)
    return unless node[2]

    attributes = extract_attribute_names(node[2])
    attributes.each do |attr|
      attr_info = {
        'name' => attr,
        'type' => type,
        'line' => extract_line_number(node)
      }

      if context['class']
        context['class']['attributes'] << attr_info
      elsif context['module']
        context['module']['attributes'] << attr_info
      else
        @metadata['attributes'] << attr_info
      end
    end
  end

  def extract_const_name(node)
    return nil unless node

    case node[0]
    when :const_ref
      node[1].to_s if node[1]
    when :const_path_ref
      parts = []
      extract_const_path(node, parts)
      parts.join('::')
    else
      nil
    end
  end

  def extract_const_path(node, parts)
    return unless node.is_a?(Array)

    case node[0]
    when :const_ref
      parts << node[1].to_s if node[1]
    when :const_path_ref
      extract_const_path(node[1], parts) if node[1]
      parts << node[2].to_s if node[2]
    end
  end

  def extract_parameters(params_node)
    return [] unless params_node

    params = []

    # Handle different parameter list formats
    if params_node[0] == :paren
      params_node = params_node[1]
    end

    if params_node[0] == :params
      # Required parameters
      if params_node[1]
        params_node[1].each do |param|
          params << {
            'name' => param.to_s,
            'required' => true,
            'type' => 'positional'
          }
        end
      end

      # Optional parameters
      if params_node[2]
        params_node[2].each do |param|
          if param.is_a?(Array) && param[0]
            params << {
              'name' => param[0].to_s,
              'required' => false,
              'type' => 'optional',
              'default' => true
            }
          end
        end
      end

      # Rest parameter
      if params_node[3]
        params << {
          'name' => params_node[3].to_s,
          'required' => false,
          'type' => 'rest'
        }
      end

      # Keyword parameters
      if params_node[4]
        params_node[4].each do |param|
          if param.is_a?(Array)
            params << {
              'name' => param[0].to_s,
              'required' => param[1].nil?,
              'type' => 'keyword'
            }
          end
        end
      end

      # Block parameter
      if params_node[6]
        params << {
          'name' => params_node[6].to_s,
          'required' => false,
          'type' => 'block'
        }
      end
    end

    params
  end

  def extract_string(node)
    return nil unless node && node[0] == :string_literal

    if node[1] && node[1][0] == :string_content && node[1][1]
      node[1][1][1] if node[1][1][0] == :@tstring_content
    end
  end

  def extract_attribute_names(node)
    names = []

    case node[0]
    when :symbol_literal
      if node[1] && node[1][0] == :symbol && node[1][1]
        names << node[1][1][1].to_s if node[1][1][0] == :@ident
      end
    when :args_add_block
      if node[1] && node[1][0] == :args_add && node[1][2]
        node[1][2].each do |arg|
          if arg[0] == :symbol_literal
            names.concat(extract_attribute_names(arg))
          end
        end
      end
    end

    names
  end

  def extract_line_number(node)
    # Ripper doesn't provide line numbers directly in the AST
    # This would need to be enhanced with location tracking
    1
  end

  def build_full_name(context, name)
    parts = []
    parts << context['module']['name'] if context['module']
    parts << context['class']['name'] if context['class']
    parts << name
    parts.compact.join('::')
  end

  def try_parser_gem
    # Try to use the 'parser' gem if available (better AST)
    begin
      require 'parser/current'

      buffer = Parser::Source::Buffer.new(@file_path)
      buffer.source = @content

      parser = Parser::CurrentRuby.new
      ast = parser.parse(buffer)

      if ast
        @metadata['parser'] = 'parser gem'
        process_parser_gem_ast(ast)
        @metadata['success'] = true
      end
    rescue LoadError
      # parser gem not available
      @metadata['parser_gem_available'] = false
    rescue => e
      @metadata['parser_gem_error'] = e.message
    end
  end

  def process_parser_gem_ast(ast)
    # Process AST from parser gem
    # This provides better location info and more detailed AST
    return unless ast

    case ast.type
    when :class
      name_node, superclass_node, body = ast.children
      class_info = {
        'name' => const_name_from_node(name_node),
        'superclass' => const_name_from_node(superclass_node),
        'line' => ast.loc.line,
        'methods' => [],
        'classMethods' => []
      }

      process_parser_gem_ast(body) if body
      @metadata['classes'] << class_info

    when :module
      name_node, body = ast.children
      module_info = {
        'name' => const_name_from_node(name_node),
        'line' => ast.loc.line,
        'methods' => []
      }

      process_parser_gem_ast(body) if body
      @metadata['modules'] << module_info

    when :def
      method_name, args, body = ast.children
      @metadata['methods'] << {
        'name' => method_name.to_s,
        'line' => ast.loc.line,
        'parameters' => extract_parser_gem_params(args)
      }

    when :defs
      receiver, method_name, args, body = ast.children
      @metadata['methods'] << {
        'name' => method_name.to_s,
        'type' => 'class',
        'line' => ast.loc.line,
        'parameters' => extract_parser_gem_params(args)
      }
    end

    # Recursively process children
    ast.children.each do |child|
      process_parser_gem_ast(child) if child.is_a?(Parser::AST::Node)
    end
  end

  def const_name_from_node(node)
    return nil unless node

    case node.type
    when :const
      node.children[1].to_s
    when :self
      'self'
    else
      nil
    end
  end

  def extract_parser_gem_params(args_node)
    return [] unless args_node

    args_node.children.map do |arg|
      case arg.type
      when :arg
        { 'name' => arg.children[0].to_s, 'required' => true }
      when :optarg
        { 'name' => arg.children[0].to_s, 'required' => false }
      when :restarg
        { 'name' => arg.children[0].to_s, 'type' => 'rest' }
      when :kwarg
        { 'name' => arg.children[0].to_s, 'type' => 'keyword', 'required' => true }
      when :kwoptarg
        { 'name' => arg.children[0].to_s, 'type' => 'keyword', 'required' => false }
      when :blockarg
        { 'name' => arg.children[0].to_s, 'type' => 'block' }
      else
        { 'name' => 'unknown', 'type' => arg.type.to_s }
      end
    end
  end

  def basic_extraction
    # Fallback to basic regex extraction
    # This ensures we always get something even if AST parsing fails

    # Extract classes
    @content.scan(/^\s*class\s+([A-Z]\w*)(?:\s*<\s*([A-Z]\w*))?/m).each do |match|
      @metadata['classes'] << {
        'name' => match[0],
        'superclass' => match[1],
        'methods' => []
      }
    end

    # Extract modules
    @content.scan(/^\s*module\s+([A-Z]\w*)/m).each do |match|
      @metadata['modules'] << {
        'name' => match[0],
        'methods' => []
      }
    end

    # Extract methods
    @content.scan(/^\s*def\s+(self\.)?(\w+)/).each do |match|
      @metadata['methods'] << {
        'name' => match[1],
        'type' => match[0] ? 'class' : 'instance'
      }
    end

    @metadata['fallback'] = 'regex'
  end
end

# Main execution
if ARGV.length < 1
  puts JSON.generate({ 'error' => 'No file path provided' })
  exit 1
end

begin
  bridge = RubyASTBridge.new(ARGV[0])
  puts bridge.parse
rescue => e
  puts JSON.generate({
    'error' => e.message,
    'backtrace' => e.backtrace.first(5)
  })
  exit 1
end